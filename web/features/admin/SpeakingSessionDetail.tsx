'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';

type TranscriptLine = {
  role: 'user' | 'assistant';
  text: string;
  at: number;
};

type SessionDetail = {
  id: string;
  status: string;
  kind: string;
  openaiCallId?: string | null;
  transcript?: unknown;
  recordingUrl?: string | null;
  recordingKey?: string | null;
  recordingMimeType?: string | null;
  recordingBytes?: number | null;
  driveFileId?: string | null;
  driveFileName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
  user?: { username: string; displayName: string } | null;
  topic?: {
    title: string;
    durationSeconds?: number;
    course?: { name: string; levelName: string } | null;
  } | null;
};

function normalizeTranscript(raw: unknown): TranscriptLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { role?: string; text?: string; at?: number };
      if ((row.role !== 'user' && row.role !== 'assistant') || !row.text) return null;
      return {
        role: row.role,
        text: String(row.text),
        at: Number(row.at) || 0,
      };
    })
    .filter(Boolean) as TranscriptLine[];
}

function formatWhen(value?: string | number | null) {
  if (value == null || value === '') return '—';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function formatBytes(bytes?: number | null) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadgeClass(status: string) {
  const ok = new Set(['SUBMITTED', 'ACTIVE']);
  const bad = new Set(['FAILED', 'UPLOAD_FAILED', 'INTERRUPTED']);
  if (ok.has(status)) return 'admin-badge on';
  if (bad.has(status)) return 'admin-badge off';
  return 'admin-badge';
}

export function SpeakingSessionDetail({
  displayName,
  sessionId,
}: {
  displayName: string;
  sessionId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/speaking/sessions/${sessionId}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không tải được phiên');
        }
        if (!cancelled) setSession(json.session as SessionDetail);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lỗi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const transcript = useMemo(
    () => normalizeTranscript(session?.transcript),
    [session?.transcript]
  );

  // Private Vercel Blob URLs return 403 if opened directly — always stream via app API.
  const hasRecording = Boolean(
    session?.recordingKey || session?.recordingUrl || (session?.recordingBytes && session.recordingBytes > 0)
  );
  const recordingSrc = hasRecording
    ? `/api/speaking/sessions/${sessionId}/recording`
    : null;
  const sizeLabel = formatBytes(session?.recordingBytes);

  return (
    <AdminShell displayName={displayName} title="Chi tiết phiên Speaking">
      <div className="admin-toolbar">
        <Link className="admin-btn" href="/admin/speaking">
          ← Danh sách
        </Link>
      </div>

      {loading ? <DataLoading /> : null}
      {error ? <div className="data-loading-state">{error}</div> : null}

      {session ? (
        <div className="admin-speaking-detail">
          <section className="admin-panel admin-speaking-meta">
            <div className="admin-speaking-meta-grid">
              <div>
                <div className="label">Học sinh</div>
                <div className="value">
                  {session.user?.displayName || '—'}
                  {session.user?.username ? (
                    <span className="muted"> (@{session.user.username})</span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="label">Chủ đề</div>
                <div className="value">{session.topic?.title || '—'}</div>
                {session.topic?.course ? (
                  <div className="muted">
                    {session.topic.course.levelName} · {session.topic.course.name}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="label">Trạng thái</div>
                <div className="value">
                  <span className={statusBadgeClass(session.status)}>{session.status}</span>
                  <span className="muted" style={{ marginLeft: 8 }}>
                    {session.kind}
                  </span>
                </div>
              </div>
              <div>
                <div className="label">Thời gian</div>
                <div className="value muted" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                  Bắt đầu: {formatWhen(session.startedAt)}
                  <br />
                  Kết thúc: {formatWhen(session.endedAt)}
                </div>
              </div>
            </div>
            {session.errorMessage ? (
              <div className="admin-alert error" style={{ marginTop: 12 }}>
                {session.errorMessage}
              </div>
            ) : null}
          </section>

          <section className="admin-panel admin-speaking-audio">
            <div className="admin-speaking-audio-head">
              <strong>
                <i className="fas fa-headphones" aria-hidden="true" /> Bản ghi âm
              </strong>
              {sizeLabel ? <span className="muted">{sizeLabel}</span> : null}
            </div>

            {recordingSrc ? (
              <>
                <audio className="admin-speaking-player" controls preload="metadata" src={recordingSrc}>
                  Trình duyệt không hỗ trợ phát audio.
                </audio>
                <div className="admin-speaking-audio-actions">
                  <a className="admin-btn" href={recordingSrc} target="_blank" rel="noreferrer">
                    <i className="fas fa-up-right-from-square" aria-hidden="true" />
                    Mở tab mới
                  </a>
                  {session.driveFileId ? (
                    <a
                      className="admin-btn"
                      href={`https://drive.google.com/file/d/${session.driveFileId}/view`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fas fa-hard-drive" aria-hidden="true" />
                      Xem trên Drive
                    </a>
                  ) : (
                    <span className="muted">Chưa có file trên Google Drive</span>
                  )}
                </div>
              </>
            ) : (
              <div className="data-loading-state">Phiên này chưa có bản ghi âm</div>
            )}
          </section>

          <section className="admin-panel admin-speaking-chat-wrap">
            <div className="speaking-chat-frame admin-speaking-chat-frame">
              <div className="speaking-chat-toolbar">
                <span>
                  <i className="fas fa-comments" aria-hidden="true" /> Hội thoại
                </span>
                <span className="speaking-chat-count">{transcript.length} lượt</span>
              </div>
              <div className="speaking-chat" role="log">
                {transcript.length === 0 ? (
                  <div className="speaking-chat-empty">Chưa có hội thoại trong phiên này.</div>
                ) : (
                  transcript.map((line, i) => (
                    <div
                      key={`${line.at}-${i}`}
                      className={`speaking-bubble speaking-bubble--${
                        line.role === 'assistant' ? 'ai' : 'user'
                      }`}
                    >
                      <span className="speaking-bubble-role">
                        {line.role === 'assistant' ? 'AI' : 'Học sinh'}
                        {line.at ? (
                          <span className="speaking-bubble-time">{formatWhen(line.at)}</span>
                        ) : null}
                      </span>
                      <p className="speaking-bubble-text">{line.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
