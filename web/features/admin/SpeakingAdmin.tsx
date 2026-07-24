'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';

type Topic = {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  durationSeconds: number;
  active: boolean;
  sortOrder: number;
  course?: { id: string; name: string; levelName: string };
};

type CourseOption = { id: string; name: string; levelName: string };

type SessionRow = {
  id: string;
  status: string;
  kind: string;
  createdAt: string;
  errorMessage?: string | null;
  user: { username: string; displayName: string };
  topic: { title: string; course?: { name: string; levelName: string } };
};

type UsageRow = {
  id: string;
  status: string;
  usageDate: string;
  sessionId?: string | null;
  user: { username: string; displayName: string };
  session?: { id: string; status: string; errorMessage?: string | null } | null;
};

export function SpeakingAdmin({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<'topics' | 'sessions' | 'usages'>('topics');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [usages, setUsages] = useState<UsageRow[]>([]);

  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(300);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [topicsRes, coursesRes, sessionsRes, usagesRes] = await Promise.all([
        fetch('/api/admin/speaking/topics'),
        fetch('/api/admin/courses?limit=200'),
        fetch('/api/admin/speaking/sessions?limit=40'),
        fetch('/api/admin/speaking/usages'),
      ]);
      const topicsJson = await topicsRes.json();
      const coursesJson = await coursesRes.json();
      const sessionsJson = await sessionsRes.json();
      const usagesJson = await usagesRes.json();

      if (topicsJson.success) setTopics(topicsJson.topics || []);
      if (coursesJson.success || coursesJson.items || coursesJson.courses) {
        const list = (coursesJson.items || coursesJson.courses || []) as CourseOption[];
        setCourses(list);
        if (!courseId && list[0]) setCourseId(list[0].id);
      }
      if (sessionsJson.success) setSessions(sessionsJson.sessions || []);
      if (usagesJson.success) setUsages(usagesJson.usages || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Lỗi tải');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTopic() {
    setMessage('');
    const res = await fetch('/api/admin/speaking/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, instructions, durationSeconds }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || 'Không tạo được topic');
      return;
    }
    setTitle('');
    setInstructions('');
    await load();
  }

  async function toggleActive(topic: Topic) {
    await fetch(`/api/admin/speaking/topics/${topic.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !topic.active }),
    });
    await load();
  }

  async function softDelete(topic: Topic) {
    if (!confirm(`Ẩn topic "${topic.title}"?`)) return;
    await fetch(`/api/admin/speaking/topics/${topic.id}`, { method: 'DELETE' });
    await load();
  }

  async function preview(topic: Topic) {
    const res = await fetch(`/api/admin/speaking/topics/${topic.id}/preview`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || 'Không tạo preview');
      return;
    }
    window.location.href = `/speaking/${topic.courseId}?topicId=${topic.id}&previewSession=${json.session.id}`;
  }

  async function releaseUsage(usage: UsageRow) {
    const reason = prompt('Lý do hoàn lượt (bắt buộc):');
    if (!reason || !reason.trim()) return;
    const res = await fetch(`/api/admin/speaking/usages/${usage.id}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || 'Không hoàn được lượt');
      return;
    }
    setMessage('Đã hoàn lượt');
    await load();
  }

  return (
    <AdminShell displayName={displayName} title="AI Speaking">
      <div className="admin-toolbar" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={tab === 'topics' ? 'admin-btn primary' : 'admin-btn'}
          onClick={() => setTab('topics')}
        >
          Topics
        </button>
        <button
          type="button"
          className={tab === 'sessions' ? 'admin-btn primary' : 'admin-btn'}
          onClick={() => setTab('sessions')}
        >
          Phiên
        </button>
        <button
          type="button"
          className={tab === 'usages' ? 'admin-btn primary' : 'admin-btn'}
          onClick={() => setTab('usages')}
        >
          Lượt hôm nay
        </button>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Tải lại
        </button>
      </div>

      {message ? <div className="data-loading-state">{message}</div> : null}
      {loading ? <DataLoading /> : null}

      {!loading && tab === 'topics' ? (
        <div>
          <div className="admin-card" style={{ marginBottom: 16 }}>
            <h3>Thêm topic</h3>
            <label className="speaking-field">
              <span>Khóa học</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.levelName} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="speaking-field">
              <span>Tiêu đề</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="speaking-field">
              <span>Hướng dẫn / prompt AI</span>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <label className="speaking-field">
              <span>Thời lượng (giây)</span>
              <input
                type="number"
                min={60}
                max={1800}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) || 300)}
              />
            </label>
            <button type="button" className="admin-btn primary" onClick={() => void createTopic()}>
              Tạo topic
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Khóa</th>
                <th>Topic</th>
                <th>Giây</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.course?.levelName} — {t.course?.name}
                  </td>
                  <td>{t.title}</td>
                  <td>{t.durationSeconds}</td>
                  <td>{t.active ? 'Yes' : 'No'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="admin-btn" onClick={() => void toggleActive(t)}>
                      {t.active ? 'Tắt' : 'Bật'}
                    </button>{' '}
                    <button type="button" className="admin-btn" onClick={() => void preview(t)}>
                      Preview
                    </button>{' '}
                    <button type="button" className="admin-btn" onClick={() => void softDelete(t)}>
                      Ẩn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && tab === 'sessions' ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Topic</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Lỗi</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.user.displayName} ({s.user.username})
                </td>
                <td>
                  {s.topic.title}
                  {s.topic.course ? ` — ${s.topic.course.name}` : ''}
                </td>
                <td>{s.kind}</td>
                <td>{s.status}</td>
                <td>{s.errorMessage || '—'}</td>
                <td>
                  <Link className="admin-btn" href={`/admin/speaking/sessions/${s.id}`}>
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {!loading && tab === 'usages' ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Trạng thái</th>
              <th>Session</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usages.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.user.displayName} ({u.user.username})
                </td>
                <td>{u.status}</td>
                <td>{u.session?.status || u.sessionId || '—'}</td>
                <td>
                  {u.status === 'CONSUMED' ? (
                    <button
                      type="button"
                      className="admin-btn primary"
                      onClick={() => void releaseUsage(u)}
                    >
                      Hoàn lượt
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </AdminShell>
  );
}
