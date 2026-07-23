'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';

type BackgroundCourse = {
  id: string;
  backgroundImageUrl?: string | null;
  backgroundImageKey?: string | null;
};

type UpdatePayload = {
  item: BackgroundCourse;
  backgroundImageSrc: string | null;
};

type CourseBackgroundEditorProps = {
  courseId: string | null;
  imageSrc: string | null;
  externalUrl: string;
  disabled?: boolean;
  onUpdated: (payload: UpdatePayload) => void;
};

export function CourseBackgroundEditor({
  courseId,
  imageSrc,
  externalUrl,
  disabled = false,
  onUpdated,
}: CourseBackgroundEditorProps) {
  const [url, setUrl] = useState(externalUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setUrl(externalUrl), [externalUrl]);

  async function readResponse(res: Response) {
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Không lưu được ảnh nền');
    }
    onUpdated(data as UpdatePayload);
  }

  async function saveUrl() {
    if (!courseId || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/background`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      await readResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được URL ảnh');
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!courseId || !file || busy) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch(`/api/admin/courses/${courseId}/background`, {
        method: 'POST',
        body: form,
      });
      await readResponse(res);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được ảnh lên');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function remove() {
    if (!courseId || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/background`, {
        method: 'DELETE',
      });
      await readResponse(res);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được ảnh');
    } finally {
      setBusy(false);
    }
  }

  if (!courseId) {
    return <span className="course-background-unsaved">Lưu Unit trước khi thêm ảnh</span>;
  }

  return (
    <div className="course-background-editor">
      <div className="course-background-preview">
        {imageSrc ? <img src={imageSrc} alt="Ảnh nền Unit" /> : <i className="fas fa-image" />}
      </div>
      <div className="course-background-controls">
        <div className="course-background-url-row">
          <input
            type="url"
            className="sheet-input"
            value={url}
            placeholder="URL ảnh https://..."
            aria-label="URL ảnh"
            disabled={disabled || busy}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button
            type="button"
            className="admin-btn"
            disabled={disabled || busy || !url.trim()}
            onClick={() => void saveUrl()}
          >
            Lưu URL
          </button>
        </div>
        <div className="admin-toolbar-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <button
            type="button"
            className="admin-btn"
            disabled={disabled || busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="fas fa-upload" aria-hidden="true" /> Tải ảnh
          </button>
          <button
            type="button"
            className="admin-btn danger"
            disabled={disabled || busy || !imageSrc}
            onClick={() => void remove()}
          >
            Xóa ảnh
          </button>
        </div>
        {busy ? (
          <div className="data-loading-state course-background-loading">
            <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
          </div>
        ) : null}
        {error ? <div className="sheet-row-msg">{error}</div> : null}
      </div>
    </div>
  );
}
