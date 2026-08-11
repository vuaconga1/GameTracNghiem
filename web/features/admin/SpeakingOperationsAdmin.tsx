'use client';

import { useCallback, useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { AdminStep } from '@/features/admin/AdminHelp';

type CourseOption = { id: string; name: string; levelName: string };

type DrillRow = {
  id: string;
  active: boolean;
  sortOrder: number;
  payload: Record<string, unknown>;
};

type AttemptRow = {
  id: string;
  activityType: string;
  status: string;
  score?: number | null;
  promptVersion?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  createdAt: string;
  user: { username: string; displayName: string };
  course: { name: string; levelName: string };
};

const DEFAULT_DRILL = JSON.stringify(
  {
    kind: 'word',
    targetText: 'environment',
    acceptedAnswers: [],
    sampleAnswers: [],
    keywords: [],
    hints: [],
  },
  null,
  2,
);

export function SpeakingOperationsAdmin({
  mode,
  courses,
}: {
  mode: 'drills' | 'attempts';
  courses: CourseOption[];
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState('');
  const [payloadText, setPayloadText] = useState(DEFAULT_DRILL);
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!courseId && courses[0]) setCourseId(courses[0].id);
  }, [courseId, courses]);

  const load = useCallback(async () => {
    if (mode === 'drills' && !courseId) return;
    setLoading(true);
    setError('');
    try {
      const path =
        mode === 'drills'
          ? `/api/admin/speaking/drills?courseId=${encodeURIComponent(courseId)}`
          : '/api/admin/speaking/attempts?limit=200';
      const response = await fetch(path);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không tải được dữ liệu');
      }
      if (mode === 'drills') setDrills(json.items || []);
      else setAttempts(json.attempts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [courseId, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDrill() {
    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError('Payload JSON không hợp lệ — kiểm tra dấu ngoặc / dấu phẩy');
      return;
    }
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(
        editingId
          ? `/api/admin/speaking/drills/${editingId}`
          : '/api/admin/speaking/drills',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wewin-csrf': '1',
          },
          body: JSON.stringify({
            ...(!editingId ? { courseId } : {}),
            payload,
            sortOrder,
            active,
          }),
        },
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không lưu được bài drill');
      }
      setEditingId('');
      setPayloadText(DEFAULT_DRILL);
      setSortOrder(0);
      setActive(true);
      setShowForm(false);
      await load();
      setMessage('Đã lưu bài luyện');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được bài drill');
    } finally {
      setBusy(false);
    }
  }

  function editDrill(row: DrillRow) {
    setEditingId(row.id);
    setPayloadText(JSON.stringify(row.payload, null, 2));
    setSortOrder(row.sortOrder);
    setActive(row.active);
    setShowForm(true);
  }

  async function deleteDrill(row: DrillRow) {
    if (!confirm('Ẩn bài luyện nói này?')) return;
    setBusy(true);
    const response = await fetch(`/api/admin/speaking/drills/${row.id}`, {
      method: 'DELETE',
      headers: { 'x-wewin-csrf': '1' },
    });
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !json.success) {
      setError(json.message || 'Không ẩn được bài drill');
      return;
    }
    setMessage('Đã ẩn bài luyện');
    await load();
  }

  async function showAttempt(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/speaking/attempts/${id}`);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không tải được attempt');
      }
      setSelectedAttempt(json.attempt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được attempt');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <DataLoading />;

  if (mode === 'attempts') {
    return (
      <div>
        {message ? <div className="admin-alert ok">{message}</div> : null}
        {error ? <div className="admin-alert error">{error}</div> : null}
        {busy ? <DataLoading /> : null}
        {selectedAttempt ? (
          <section className="admin-panel speaking-preview-panel">
            <header className="speaking-preview-head">
              <h3>Chi tiết bài làm</h3>
              <button type="button" className="admin-btn" onClick={() => setSelectedAttempt(null)}>
                Đóng
              </button>
            </header>
            <pre className="speaking-prompt-pre">{JSON.stringify(selectedAttempt, null, 2)}</pre>
          </section>
        ) : null}
        <div className="admin-panel sheet-panel">
          <div className="sheet-wrap">
            <table className="admin-table speaking-table">
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Khóa</th>
                  <th>Loại</th>
                  <th>Trạng thái / điểm</th>
                  <th>Prompt / model</th>
                  <th>Token</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-empty">Chưa có bài làm</div>
                    </td>
                  </tr>
                ) : (
                  attempts.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.user.displayName}
                        <div className="speaking-sub">{row.user.username}</div>
                      </td>
                      <td>
                        {row.course.levelName} — {row.course.name}
                      </td>
                      <td>{row.activityType}</td>
                      <td>
                        {row.status} / {row.score ?? '—'}
                      </td>
                      <td>
                        {row.promptVersion || '—'} / {row.model || '—'}
                      </td>
                      <td>
                        {row.inputTokens ?? 0} in · {row.outputTokens ?? 0} out
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => void showAttempt(row.id)}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}
      {busy ? <DataLoading /> : null}

      <div className="admin-toolbar">
        <div className="admin-toolbar-actions">
          <label className="speaking-inline-label">
            Khóa học
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.levelName} — {course.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn primary"
            onClick={() => {
              setShowForm((v) => !v);
              if (editingId) {
                setEditingId('');
                setPayloadText(DEFAULT_DRILL);
              }
            }}
          >
            <i className="fas fa-plus" aria-hidden="true" />{' '}
            {showForm ? 'Đóng form' : 'Thêm bài luyện'}
          </button>
        </div>
      </div>

      {showForm ? (
        <AdminStep
          step={1}
          title={editingId ? 'Sửa bài luyện' : 'Thêm bài luyện ngắn'}
          help="Loại thường gặp: word (một từ), sentence (một câu), guided (có gợi ý). Giữ JSON mẫu và chỉ sửa targetText nếu chưa quen."
        >
          <div className="speaking-form-grid">
            <label className="admin-field">
              <span>Khóa học</span>
              <select
                value={courseId}
                disabled={Boolean(editingId)}
                onChange={(event) => setCourseId(event.target.value)}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.levelName} — {course.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Thứ tự</span>
              <input
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value) || 0)}
              />
            </label>
            <label className="admin-field speaking-form-span">
              <span>Nội dung bài (JSON)</span>
              <textarea
                rows={12}
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                className="speaking-code-textarea"
              />
            </label>
            <label className="course-game-switch">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              <span className="course-game-switch-ui" aria-hidden="true" />
              <span className="course-game-switch-text">Đang bật cho học sinh</span>
            </label>
            <div className="speaking-form-actions">
              <button
                type="button"
                className="admin-btn primary"
                disabled={busy}
                onClick={() => void saveDrill()}
              >
                {editingId ? 'Lưu thay đổi' : 'Tạo bài'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => {
                    setEditingId('');
                    setPayloadText(DEFAULT_DRILL);
                    setShowForm(false);
                  }}
                >
                  Hủy sửa
                </button>
              ) : null}
            </div>
          </div>
        </AdminStep>
      ) : null}

      <div className="admin-panel sheet-panel">
        <div className="sheet-wrap">
          <table className="admin-table speaking-table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>Thứ tự</th>
                <th style={{ width: 100 }}>Loại</th>
                <th>Nội dung</th>
                <th style={{ width: 100 }}>Trạng thái</th>
                <th style={{ width: 160 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {drills.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty">
                      Chưa có bài luyện cho khóa này. Bấm <strong>Thêm bài luyện</strong>.
                    </div>
                  </td>
                </tr>
              ) : (
                drills.map((row) => (
                  <tr key={row.id}>
                    <td>{row.sortOrder}</td>
                    <td>{String(row.payload.kind || '—')}</td>
                    <td>{String(row.payload.targetText || row.payload.questionText || '—')}</td>
                    <td>
                      <span className={`admin-badge ${row.active ? 'on' : 'off'}`}>
                        {row.active ? 'Đang mở' : 'Đã tắt'}
                      </span>
                    </td>
                    <td>
                      <div className="speaking-row-actions">
                        <button type="button" className="admin-btn" onClick={() => editDrill(row)}>
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="admin-btn danger"
                          onClick={() => void deleteDrill(row)}
                        >
                          Ẩn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
