'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import { PRESET_AVATARS } from '@/lib/avatar';

type AvatarEditorModalProps = {
  open: boolean;
  currentAvatarUrl?: string | null;
  displayName: string;
  onClose: () => void;
  onSaved: (avatarUrl: string | null) => void;
};

type View = 'select' | 'crop';

const OUTPUT_SIZE = 320;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AvatarEditorModal({
  open,
  currentAvatarUrl,
  displayName,
  onClose,
  onSaved,
}: AvatarEditorModalProps) {
  const { t } = useI18n();
  const [view, setView] = useState<View>('select');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseScaleRef = useRef(1);
  const natRef = useRef({ w: 0, h: 0 });
  const viewportSizeRef = useRef(260);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const resetState = useCallback(() => {
    setView('select');
    setSelectedPreset(null);
    setError('');
    setSaving(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }, [cropSrc]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    resetState();
    onClose();
  }

  function clampOffset(x: number, y: number, displayScale: number) {
    const V = viewportSizeRef.current;
    const dw = natRef.current.w * displayScale;
    const dh = natRef.current.h * displayScale;
    return {
      x: clamp(x, V - dw, 0),
      y: clamp(y, V - dh, 0),
    };
  }

  function onImageLoaded() {
    const img = imgRef.current;
    const viewport = viewportRef.current;
    if (!img || !viewport) return;
    const V = viewport.clientWidth || 260;
    viewportSizeRef.current = V;
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    natRef.current = { w: natW, h: natH };
    const baseScale = Math.max(V / natW, V / natH);
    baseScaleRef.current = baseScale;
    setZoom(1);
    const dw = natW * baseScale;
    const dh = natH * baseScale;
    setOffset(clampOffset((V - dw) / 2, (V - dh) / 2, baseScale));
  }

  function handleZoomChange(nextZoom: number) {
    const V = viewportSizeRef.current;
    const oldScale = baseScaleRef.current * zoom;
    const newScale = baseScaleRef.current * nextZoom;
    const centerX = (V / 2 - offset.x) / oldScale;
    const centerY = (V / 2 - offset.y) / oldScale;
    const nextX = V / 2 - centerX * newScale;
    const nextY = V / 2 - centerY * newScale;
    setZoom(nextZoom);
    setOffset(clampOffset(nextX, nextY, newScale));
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const displayScale = baseScaleRef.current * zoom;
    const nextX = drag.ox + (event.clientX - drag.startX);
    const nextY = drag.oy + (event.clientY - drag.startY);
    setOffset(clampOffset(nextX, nextY, displayScale));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function handleFilePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('avatar.errorInvalidType'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t('avatar.errorTooLarge'));
      return;
    }
    setError('');
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setView('crop');
  }

  async function persistAvatar(value: string) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: value }),
      });
      const data = (await res.json()) as { success?: boolean; avatarUrl?: string; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || t('avatar.errorSave'));
      }
      onSaved(data.avatarUrl ?? value);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('avatar.errorSave'));
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/avatar', { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || t('avatar.errorSave'));
      }
      onSaved(null);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('avatar.errorSave'));
      setSaving(false);
    }
  }

  function handleSelectSave() {
    if (!selectedPreset) return;
    void persistAvatar(selectedPreset);
  }

  function handleCropSave() {
    const img = imgRef.current;
    if (!img) return;
    const V = viewportSizeRef.current;
    const displayScale = baseScaleRef.current * zoom;
    const scaleOut = OUTPUT_SIZE / V;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError(t('avatar.errorSave'));
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      0,
      0,
      natRef.current.w,
      natRef.current.h,
      offset.x * scaleOut,
      offset.y * scaleOut,
      natRef.current.w * displayScale * scaleOut,
      natRef.current.h * displayScale * scaleOut
    );
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    void persistAvatar(dataUrl);
  }

  if (!open) return null;

  const displayScale = baseScaleRef.current * zoom;

  return (
    <div className="avatar-modal-overlay" role="presentation" onClick={handleClose}>
      <div
        className="avatar-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="avatar-modal-header">
          <h2 id="avatar-modal-title">{t('avatar.title')}</h2>
          <button
            type="button"
            className="avatar-modal-close"
            aria-label={t('common.cancel')}
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {view === 'select' ? (
          <div className="avatar-modal-body">
            <p className="avatar-modal-hint">{t('avatar.presetHint')}</p>
            <div className="avatar-preset-grid">
              {PRESET_AVATARS.map((preset) => {
                const active = selectedPreset === preset || (!selectedPreset && currentAvatarUrl === preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    className={`avatar-preset${active ? ' is-active' : ''}`}
                    onClick={() => setSelectedPreset(preset)}
                    aria-pressed={active}
                  >
                    <img src={preset} alt="" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fas fa-upload" aria-hidden="true" /> {t('avatar.uploadButton')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="avatar-file-input"
              onChange={handleFilePick}
            />

            {error ? <p className="avatar-modal-error">{error}</p> : null}

            <div className="avatar-modal-actions">
              {currentAvatarUrl ? (
                <button
                  type="button"
                  className="avatar-btn avatar-btn-ghost"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  {t('avatar.remove')}
                </button>
              ) : (
                <span />
              )}
              <div className="avatar-modal-actions-right">
                <button
                  type="button"
                  className="avatar-btn avatar-btn-secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="avatar-btn avatar-btn-primary"
                  onClick={handleSelectSave}
                  disabled={saving || !selectedPreset}
                >
                  {saving ? t('avatar.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="avatar-modal-body">
            <div className="avatar-crop-stage">
              <div
                className="avatar-crop-viewport"
                ref={viewportRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {cropSrc ? (
                  <img
                    ref={imgRef}
                    src={cropSrc}
                    alt=""
                    className="avatar-crop-image"
                    draggable={false}
                    onLoad={onImageLoaded}
                    style={{
                      width: `${natRef.current.w * displayScale}px`,
                      height: `${natRef.current.h * displayScale}px`,
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                    }}
                  />
                ) : null}
                <div className="avatar-crop-ring" aria-hidden="true" />
              </div>
            </div>

            <div className="avatar-crop-zoom">
              <i className="fas fa-image avatar-zoom-icon-sm" aria-hidden="true" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => handleZoomChange(Number(event.target.value))}
                aria-label={t('avatar.zoom')}
              />
              <i className="fas fa-image avatar-zoom-icon-lg" aria-hidden="true" />
            </div>

            {error ? <p className="avatar-modal-error">{error}</p> : null}

            <div className="avatar-modal-actions">
              <span />
              <div className="avatar-modal-actions-right">
                <button
                  type="button"
                  className="avatar-btn avatar-btn-secondary"
                  onClick={() => {
                    if (cropSrc) URL.revokeObjectURL(cropSrc);
                    setCropSrc(null);
                    setView('select');
                    setError('');
                  }}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="avatar-btn avatar-btn-primary"
                  onClick={handleCropSave}
                  disabled={saving}
                >
                  {saving ? t('avatar.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
