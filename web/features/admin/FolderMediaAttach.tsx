'use client';

import { useRef, useState } from 'react';

import { mediaKindFromFilename } from '@/lib/media/normalizeMediaKey';

type AttachReport = {
  attached: Array<{ filename: string; key: string; url: string }>;
  skippedFilled: Array<{ filename: string; key: string }>;
  unmatched: Array<{ filename: string; reason: string }>;
  errors: Array<{ filename: string; reason: string }>;
};

type Props = {
  courseId: string;
  game: string;
  kind: 'image' | 'audio';
  label: string;
  disabled?: boolean;
  onDone: () => void;
};

const BATCH_SIZE = 8;

function emptyReport(): AttachReport {
  return { attached: [], skippedFilled: [], unmatched: [], errors: [] };
}

function mergeReports(target: AttachReport, source: AttachReport) {
  target.attached.push(...source.attached);
  target.skippedFilled.push(...source.skippedFilled);
  target.unmatched.push(...source.unmatched);
  target.errors.push(...source.errors);
}

function pickUploadFiles(fileList: FileList, kind: 'image' | 'audio'): File[] {
  return Array.from(fileList).filter((file) => {
    if (!file.size) return false;
    const detected = mediaKindFromFilename(file.name);
    return detected === kind;
  });
}

async function postBatch(
  courseId: string,
  game: string,
  kind: 'image' | 'audio',
  files: File[]
): Promise<AttachReport> {
  const form = new FormData();
  form.set('courseId', courseId);
  form.set('game', game);
  form.set('kind', kind);
  for (const file of files) {
    form.append('files', file, file.name);
  }

  const res = await fetch('/api/admin/media/attach', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  let data: {
    success?: boolean;
    message?: string;
    attached?: AttachReport['attached'];
    skippedFilled?: AttachReport['skippedFilled'];
    unmatched?: AttachReport['unmatched'];
    errors?: AttachReport['errors'];
  };
  try {
    data = await res.json();
  } catch {
    throw new Error('Phản hồi server không hợp lệ');
  }

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gắn thư mục thất bại');
  }

  return {
    attached: data.attached ?? [],
    skippedFilled: data.skippedFilled ?? [],
    unmatched: data.unmatched ?? [],
    errors: data.errors ?? [],
  };
}

export function FolderMediaAttach({ courseId, game, kind, label, disabled, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState<AttachReport | null>(null);
  const [error, setError] = useState('');

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = pickUploadFiles(fileList, kind);
    if (!files.length) {
      setError(
        kind === 'image'
          ? 'Không có file ảnh (.png, .jpg, .webp…) trong thư mục đã chọn.'
          : 'Không có file audio (.mp3, .wav…) trong thư mục đã chọn.'
      );
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (
      !window.confirm(
        kind === 'image'
          ? `Sẽ gắn ${files.length} ảnh vào các dòng đang trống Link hình. Không ghi đè link đã có.`
          : `Sẽ gắn ${files.length} file audio vào các dòng đang trống Link audio. Không ghi đè link đã có.`
      )
    ) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setBusy(true);
    setError('');
    setReport(null);
    const total = files.length;
    const merged = emptyReport();

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batchTotal = Math.ceil(files.length / BATCH_SIZE);
        setProgress(`Đang gắn lô ${batchNum}/${batchTotal}…`);
        const part = await postBatch(courseId, game, kind, batch);
        mergeReports(merged, part);
      }
      setReport(merged);
      setProgress('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi gắn media');
      if (merged.attached.length) {
        setReport(merged);
        onDone();
      }
    } finally {
      setBusy(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="folder-media-attach">
      <input
        ref={inputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is widely supported
        webkitdirectory=""
        directory=""
        hidden
        onChange={(e) => void onFilesSelected(e.target.files)}
      />
      <button
        type="button"
        className="admin-btn"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <i className={`fas ${kind === 'image' ? 'fa-images' : 'fa-music'}`} aria-hidden="true" />{' '}
        {busy ? progress || 'Đang gắn...' : label}
      </button>
      {error ? <div className="admin-alert error">{error}</div> : null}
      {report ? (
        <div className="admin-alert ok" style={{ whiteSpace: 'pre-wrap' }}>
          {`Đã gắn: ${report.attached.length}\nBỏ qua (đã có link): ${report.skippedFilled.length}\nKhông khớp / lỗi: ${report.unmatched.length + report.errors.length}`}
          {report.unmatched.length || report.errors.length ? (
            <details>
              <summary>Chi tiết không khớp</summary>
              <ul>
                {[...report.unmatched, ...report.errors].map((row) => (
                  <li key={row.filename + row.reason}>
                    {row.filename} — {row.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
