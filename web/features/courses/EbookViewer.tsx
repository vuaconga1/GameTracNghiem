'use client';

import dynamic from 'next/dynamic';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type EbookViewerProps = {
  ebookId: string;
  pageStart: number;
  pageEnd: number;
};

type PdfViewport = { width: number; height: number };

type PdfRenderTask = {
  promise: Promise<void>;
  cancel: () => void;
};

type PdfPage = {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => PdfRenderTask;
};

type PdfDoc = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type FlipApi = {
  pageFlip: () => {
    flipPrev: () => void;
    flipNext: () => void;
    turnToPage: (pageIndex: number) => void;
    getCurrentPageIndex: () => number;
  } | null;
};

const HTMLFlipBook = dynamic(() => import('react-pageflip'), {
  ssr: false,
  loading: () => (
    <div className="ebook-loading data-loading-state">
      <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
    </div>
  ),
});

const FlipPage = forwardRef<HTMLDivElement, { src: string; label: string }>(
  function FlipPage({ src, label }, ref) {
    return (
      <div className="ebook-flip-page" ref={ref} data-density="soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} draggable={false} />
      </div>
    );
  },
);

async function rasterizePage(doc: PdfDoc, pageNumber: number, scale: number): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const pdfPage = await doc.getPage(pageNumber);
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('Không tạo được canvas để vẽ trang');
  }
  // Prefer crisp vector→bitmap for textbook text (avoid soft JPEG + upscale).
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  await pdfPage.render({ canvasContext: context, viewport }).promise;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

function computeRenderScale(pageWidthAt1x: number, displayCssWidth: number): number {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  // Render sharper than on-screen pixels so zoom/DnD never softens text.
  const targetPx = Math.max(displayCssWidth, 720) * dpr * 1.25;
  let scale = targetPx / Math.max(1, pageWidthAt1x);
  const maxCanvasWidth = 4096;
  if (pageWidthAt1x * scale > maxCanvasWidth) {
    scale = maxCanvasWidth / pageWidthAt1x;
  }
  return Math.max(2, Math.min(scale, 5));
}

export function EbookViewer({ ebookId, pageStart, pageEnd }: EbookViewerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<FlipApi | null>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState({ width: 600, height: 850 });
  const [flipIndex, setFlipIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [stageWidth, setStageWidth] = useState(640);

  const safeStart = Math.max(1, pageStart || 1);
  const safeEnd = Math.max(safeStart, pageEnd || safeStart);
  const totalInRange = safeEnd - safeStart + 1;
  const displayIndex = Math.min(totalInRange, Math.max(1, flipIndex + 1));

  useEffect(() => {
    setFlipIndex(0);
    setPageImages([]);
  }, [ebookId, safeStart, safeEnd]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setDoc(null);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({
          url: `/api/ebooks/${ebookId}/file`,
          withCredentials: true,
        }).promise;
        if (cancelled) return;
        setDoc(pdf as unknown as PdfDoc);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không mở được sách PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ebookId]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setRendering(true);
        setError('');
        try {
          const probe = await doc.getPage(safeStart);
          const base = probe.getViewport({ scale: 1 });
          const displayCssWidth = Math.min(Math.max(stageWidth, 320), 1200) * zoom;
          const scale = computeRenderScale(base.width, displayCssWidth);

          const urls: string[] = [];
          for (let n = safeStart; n <= safeEnd; n += 1) {
            const rendered = await rasterizePage(doc, n, scale);
            if (cancelled) return;
            urls.push(rendered.dataUrl);
          }
          if (cancelled) return;
          // Keep PDF unit aspect (not scaled canvas px) for layout math.
          setPageSize({ width: base.width, height: base.height });
          setPageImages(urls);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Không vẽ được trang sách');
          }
        } finally {
          if (!cancelled) setRendering(false);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [doc, safeStart, safeEnd, stageWidth, zoom]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || 640;
      setStageWidth(Math.max(280, w));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bookWidth = useMemo(() => {
    // Fill most of the content width; allow vertical scroll for tall pages.
    // (Previously height-fit made portrait pages tiny on wide monitors.)
    const maxW = Math.min(Math.max(stageWidth - 16, 320), 1120);
    return Math.round(maxW * zoom);
  }, [stageWidth, zoom]);

  const bookHeight = useMemo(() => {
    // Use PDF aspect (from unit page size), not canvas pixel size, so ratio stays correct.
    const ratio = pageSize.height / Math.max(1, pageSize.width);
    return Math.round(bookWidth * ratio);
  }, [bookWidth, pageSize.height, pageSize.width]);

  const canPrev = !loading && !rendering && flipIndex > 0;
  const canNext = !loading && !rendering && flipIndex < pageImages.length - 1;

  const goPrev = useCallback(() => {
    flipRef.current?.pageFlip()?.flipPrev();
  }, []);

  const goNext = useCallback(() => {
    flipRef.current?.pageFlip()?.flipNext();
  }, []);

  const onFlip = useCallback((e: { data: number }) => {
    setFlipIndex(e.data);
  }, []);

  let book: ReactNode = null;
  if (!loading && !error && pageImages.length > 0 && !rendering) {
    book = (
      // react-pageflip typings mark className/style required; size stretch fills stage
      <HTMLFlipBook
        key={`${ebookId}-${pageImages.length}-${bookWidth}-${pageImages[0]?.slice(0, 48) ?? 'x'}`}
        width={bookWidth}
        height={bookHeight}
        size="fixed"
        minWidth={240}
        maxWidth={1200}
        minHeight={320}
        maxHeight={1800}
        showCover={false}
        usePortrait
        startZIndex={0}
        mobileScrollSupport
        drawShadow
        maxShadowOpacity={0.35}
        flippingTime={850}
        startPage={flipIndex}
        autoSize={false}
        clickEventForward
        useMouseEvents
        swipeDistance={30}
        showPageCorners
        disableFlipByClick={false}
        className="ebook-flip-book"
        style={{ margin: '0 auto' }}
        onFlip={onFlip}
        ref={flipRef as never}
      >
        {pageImages.map((src, index) => (
          <FlipPage
            key={`${ebookId}-p${index}`}
            src={src}
            label={`Trang ${index + 1} / ${pageImages.length}`}
          />
        ))}
      </HTMLFlipBook>
    );
  }

  return (
    <div className="ebook-flip-root" ref={stageRef}>
      <div
        className="ebook-viewer ebook-viewer--natural ebook-viewer--flip"
        style={
          !loading && !rendering && !error && pageImages.length > 0
            ? { width: Math.min(stageWidth, Math.round(bookWidth + 8)) }
            : undefined
        }
      >
        <div className="ebook-toolbar">
          <div className="ebook-toolbar-group ebook-toolbar-center">
            <span className="ebook-page-info" aria-live="polite">
              {loading || rendering ? '…' : `${displayIndex} / ${totalInRange}`}
            </span>
          </div>
          <div className="ebook-toolbar-group">
            <button
              type="button"
              className="ebook-btn"
              title="Thu nhỏ"
              disabled={loading || rendering || zoom <= 0.8}
              onClick={() => setZoom((z) => Math.max(0.8, Math.round((z - 0.1) * 100) / 100))}
            >
              <i className="fas fa-minus" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ebook-btn"
              title="Phóng to"
              disabled={loading || rendering || zoom >= 1.4}
              onClick={() => setZoom((z) => Math.min(1.4, Math.round((z + 0.1) * 100) / 100))}
            >
              <i className="fas fa-plus" aria-hidden="true" />
            </button>
          </div>
        </div>

        {error ? <div className="ebook-empty">{error}</div> : null}
        {loading || rendering ? (
          <div className="ebook-loading data-loading-state">
            <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
          </div>
        ) : null}

        <div className="ebook-stage" hidden={loading || rendering || Boolean(error)}>
          <div className="ebook-canvas-wrap ebook-flip-wrap">
            {book}
            <button
              type="button"
              className="ebook-side-nav ebook-side-nav-prev"
              title="Trang trước"
              aria-label="Trang trước"
              disabled={!canPrev}
              onClick={goPrev}
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ebook-side-nav ebook-side-nav-next"
              title="Trang sau"
              aria-label="Trang sau"
              disabled={!canNext}
              onClick={goNext}
            >
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
