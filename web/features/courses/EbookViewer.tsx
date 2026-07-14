'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

export function EbookViewer({ ebookId, pageStart, pageEnd }: EbookViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);
  const renderSeqRef = useRef(0);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(pageStart);
  /** Zoom multiplier on native PDF page scale (1 = kích thước trang gốc). */
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');

  const safeStart = Math.max(1, pageStart || 1);
  const safeEnd = Math.max(safeStart, pageEnd || safeStart);

  useEffect(() => {
    setPage(safeStart);
  }, [ebookId, safeStart]);

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
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [ebookId]);

  const renderPage = useCallback(async () => {
    if (!doc || !canvasRef.current) return;

    const seq = ++renderSeqRef.current;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;

    setRendering(true);
    try {
      const pdfPage = await doc.getPage(page);
      if (seq !== renderSeqRef.current) return;

      const viewport = pdfPage.getViewport({ scale: Math.max(0.5, zoom) });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Reset canvas before starting a new render to avoid stale pending ops.
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const task = pdfPage.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      await task.promise;

      if (seq === renderSeqRef.current) {
        renderTaskRef.current = null;
      }
    } catch (err) {
      const cancelled =
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        String((err as { name: string }).name) === 'RenderingCancelledException';
      if (cancelled || seq !== renderSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Không vẽ được trang');
    } finally {
      if (seq === renderSeqRef.current) {
        setRendering(false);
      }
    }
  }, [doc, page, zoom]);

  useEffect(() => {
    void renderPage();
    return () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [renderPage]);

  const displayIndex = page - safeStart + 1;
  const totalInRange = safeEnd - safeStart + 1;
  const canPrev = !loading && page > safeStart;
  const canNext = !loading && page < safeEnd;

  function goPrev() {
    setPage((p) => Math.max(safeStart, p - 1));
  }

  function goNext() {
    setPage((p) => Math.min(safeEnd, p + 1));
  }

  return (
    <div className="ebook-viewer ebook-viewer--natural">
      <div className="ebook-toolbar">
        <div className="ebook-toolbar-group ebook-toolbar-center">
          <span className="ebook-page-info" aria-live="polite">
            {loading ? '…' : `${displayIndex} / ${totalInRange}`}
          </span>
        </div>
        <div className="ebook-toolbar-group">
          <button
            type="button"
            className="ebook-btn"
            title="Thu nhỏ"
            disabled={loading || zoom <= 0.8}
            onClick={() => setZoom((z) => Math.max(0.8, Math.round((z - 0.1) * 100) / 100))}
          >
            <i className="fas fa-minus" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ebook-btn"
            title="Phóng to"
            disabled={loading || zoom >= 1.8}
            onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 100) / 100))}
          >
            <i className="fas fa-plus" aria-hidden="true" />
          </button>
        </div>
      </div>

      {error ? <div className="ebook-empty">{error}</div> : null}
      {loading ? (
        <div className="ebook-loading data-loading-state">
          <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
        </div>
      ) : null}

      <div className="ebook-stage" hidden={loading || Boolean(error)}>
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

        <div className="ebook-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} aria-label={`Trang ${displayIndex} / ${totalInRange}`} />
          {rendering ? (
            <div className="ebook-loading data-loading-state ebook-loading-overlay">
              <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
            </div>
          ) : null}
        </div>

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
  );
}
