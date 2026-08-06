'use client';

import { useCallback, useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';

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
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState('');
  const [payloadText, setPayloadText] = useState(DEFAULT_DRILL);
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!courseId && courses[0]) setCourseId(courses[0].id);
  }, [courseId, courses]);

  const load = useCallback(async () => {
    if (mode === 'drills' && !courseId) return;
    setLoading(true);
    setMessage('');
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được dữ liệu');
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
      setMessage('Payload JSON không hợp lệ');
      return;
    }
    setBusy(true);
    setMessage('');
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
      await load();
      setMessage('Đã lưu bài drill');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được bài drill');
    } finally {
      setBusy(false);
    }
  }

  function editDrill(row: DrillRow) {
    setEditingId(row.id);
    setPayloadText(JSON.stringify(row.payload, null, 2));
    setSortOrder(row.sortOrder);
    setActive(row.active);
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
      setMessage(json.message || 'Không ẩn được bài drill');
      return;
    }
    await load();
  }

  async function showAttempt(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/speaking/attempts/${id}`);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không tải được attempt');
      }
      setSelectedAttempt(json.attempt);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được attempt');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <DataLoading />;

  if (mode === 'attempts') {
    return (
      <div>
        {busy ? <DataLoading /> : null}
        {message ? <DataLoading variant="message" message={message} /> : null}
        {selectedAttempt ? (
          <section className="admin-card" style={{ marginBottom: 16 }}>
            <h3>Chi tiết attempt</h3>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(selectedAttempt, null, 2)}
            </pre>
            <button type="button" className="admin-btn" onClick={() => setSelectedAttempt(null)}>
              Đóng chi tiết
            </button>
          </section>
        ) : null}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Khóa</th>
              <th>Activity</th>
              <th>Trạng thái / điểm</th>
              <th>Prompt / model</th>
              <th>Usage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {attempts.map((row) => (
              <tr key={row.id}>
                <td>{row.user.displayName} ({row.user.username})</td>
                <td>{row.course.levelName} — {row.course.name}</td>
                <td>{row.activityType}</td>
                <td>{row.status} / {row.score ?? '—'}</td>
                <td>{row.promptVersion || '—'} / {row.model || '—'}</td>
                <td>{row.inputTokens ?? 0} in · {row.outputTokens ?? 0} out</td>
                <td>
                  <button type="button" className="admin-btn" onClick={() => void showAttempt(row.id)}>
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {busy ? <DataLoading /> : null}
      {message ? <DataLoading variant="message" message={message} /> : null}
      <section className="admin-card" style={{ marginBottom: 16 }}>
        <h3>{editingId ? 'Sửa bài drill' : 'Thêm bài drill'}</h3>
        <label className="speaking-field">
          <span>Khóa học</span>
          <select value={courseId} disabled={Boolean(editingId)} onChange={(event) => setCourseId(event.target.value)}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.levelName} — {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="speaking-field">
          <span>Payload JSON (word / sentence / guided)</span>
          <textarea rows={13} value={payloadText} onChange={(event) => setPayloadText(event.target.value)} />
        </label>
        <label className="speaking-field">
          <span>Thứ tự</span>
          <input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value) || 0)} />
        </label>
        <label className="speaking-field">
          <span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Đang bật</span>
        </label>
        <button type="button" className="admin-btn primary" disabled={busy} onClick={() => void saveDrill()}>
          {editingId ? 'Lưu thay đổi' : 'Tạo bài'}
        </button>{' '}
        {editingId ? (
          <button type="button" className="admin-btn" onClick={() => {
            setEditingId('');
            setPayloadText(DEFAULT_DRILL);
          }}>
            Hủy sửa
          </button>
        ) : null}
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Thứ tự</th>
            <th>Loại</th>
            <th>Nội dung</th>
            <th>Bật</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {drills.map((row) => (
            <tr key={row.id}>
              <td>{row.sortOrder}</td>
              <td>{String(row.payload.kind || '—')}</td>
              <td>{String(row.payload.targetText || row.payload.questionText || '—')}</td>
              <td>{row.active ? 'Yes' : 'No'}</td>
              <td>
                <button type="button" className="admin-btn" onClick={() => editDrill(row)}>Sửa</button>{' '}
                <button type="button" className="admin-btn" onClick={() => void deleteDrill(row)}>Ẩn</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
