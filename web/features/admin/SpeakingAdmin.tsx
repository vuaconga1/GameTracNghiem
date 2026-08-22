'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { SpeakingAccessAdmin } from '@/features/admin/SpeakingAccessAdmin';
import { SpeakingOperationsAdmin } from '@/features/admin/SpeakingOperationsAdmin';
import { sheetNav, useSheetKeyboard } from '@/features/admin/useSheetKeyboard';
import { isSentenceCorrectionSpeakingGrade } from '@/lib/speaking/gradeBand';

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

function topicInstructionsHelp(levelName?: string) {
  if (isSentenceCorrectionSpeakingGrade({ levelName })) {
    return {
      label:
        'Lớp 1–5: ghi 5 câu hỏi (mỗi dòng một câu). AI hỏi lần lượt, chấm và sửa phát âm — không nói tự do.',
      placeholder:
        '1. What is your name?\n2. How old are you?\n3. What colour do you like?\n4. Do you like school?\n5. What do you like to play?',
    };
  }
  return {
    label: 'Lớp 6–9: mô tả chủ đề để AI hội thoại và trả lời tự do.',
    placeholder: 'Talk about leisure activities with the student…',
  };
}

type CourseOption = { id: string; name: string; levelName: string };

type SessionRow = {
  id: string;
  status: string;
  kind: string;
  activityType: string;
  createdAt: string;
  errorMessage?: string | null;
  model?: string | null;
  configSnapshot?: { promptVersion?: string } | null;
  user: { username: string; displayName: string };
  topic?: { title: string; course?: { name: string; levelName: string } } | null;
};

type UsageRow = {
  id: string;
  status: string;
  usageDate: string;
  activityType: string;
  usedCount: number;
  reservedCount: number;
  limitSnapshot: number;
  sessionId?: string | null;
  user: { username: string; displayName: string };
  session?: { id: string; status: string; errorMessage?: string | null } | null;
};

type TabId =
  | 'topics'
  | 'drills'
  | 'attempts'
  | 'sessions'
  | 'usages'
  | 'entitlements'
  | 'config';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'topics', label: 'Chủ đề' },
  { id: 'drills', label: 'Bài luyện' },
  { id: 'attempts', label: 'Bài làm' },
  { id: 'sessions', label: 'Phiên' },
  { id: 'usages', label: 'Lượt' },
  { id: 'entitlements', label: 'Cấp quyền' },
  { id: 'config', label: 'Cấu hình' },
];

type TopicDraft = {
  key: string;
  id: string | null;
  courseId: string;
  title: string;
  instructions: string;
  durationSeconds: number;
  active: boolean;
  dirty: boolean;
  courseLabel: string;
};

function toDraft(topic: Topic): TopicDraft {
  return {
    key: topic.id,
    id: topic.id,
    courseId: topic.courseId,
    title: topic.title,
    instructions: topic.instructions,
    durationSeconds: topic.durationSeconds,
    active: topic.active,
    dirty: false,
    courseLabel: topic.course
      ? `${topic.course.levelName} — ${topic.course.name}`
      : '—',
  };
}

export function SpeakingAdmin({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<TabId>('topics');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<TopicDraft[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [usages, setUsages] = useState<UsageRow[]>([]);
  const [filterCourseId, setFilterCourseId] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [promptPreview, setPromptPreview] = useState<{
    topicTitle: string;
    prompt: string;
    promptVersion?: string | null;
    model?: string | null;
  } | null>(null);

  const dirtyCount = rows.filter((r) => r.dirty).length;
  const sheetKeys = useSheetKeyboard(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [topicsRes, coursesRes, sessionsRes, usagesRes] = await Promise.all([
        fetch('/api/admin/speaking/topics'),
        fetch('/api/admin/courses?limit=200'),
        fetch('/api/admin/speaking/sessions?limit=100&current=1'),
        fetch('/api/admin/speaking/usages'),
      ]);
      const topicsJson = await topicsRes.json();
      const coursesJson = await coursesRes.json();
      const sessionsJson = await sessionsRes.json();
      const usagesJson = await usagesRes.json();

      const nextTopics = topicsJson.success ? ((topicsJson.topics || []) as Topic[]) : [];
      setRows(nextTopics.map(toDraft));

      if (coursesJson.success || coursesJson.items || coursesJson.courses) {
        setCourses((coursesJson.items || coursesJson.courses || []) as CourseOption[]);
      }
      if (sessionsJson.success) setSessions(sessionsJson.sessions || []);
      if (usagesJson.success) setUsages(usagesJson.usages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterCourseId && row.courseId !== filterCourseId) return false;
      if (!q) return true;
      return `${row.title} ${row.courseLabel}`.toLowerCase().includes(q);
    });
  }, [rows, filterCourseId, topicQuery]);

  function patchRow(key: string, patch: Partial<TopicDraft>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch, dirty: true } : row)),
    );
  }

  function addRow() {
    const course = courses.find((c) => c.id === filterCourseId) || courses[0];
    if (!course) {
      setError('Chưa có khóa học — tạo unit trước');
      return;
    }
    const key = `new-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        key,
        id: null,
        courseId: course.id,
        title: '',
        instructions: '',
        durationSeconds: 300,
        active: true,
        dirty: true,
        courseLabel: `${course.levelName} — ${course.name}`,
      },
    ]);
    setExpandedKey(key);
    setMessage('');
  }

  async function saveDirty() {
    const dirty = rows.filter((r) => r.dirty);
    if (!dirty.length) return;
    setSaving(true);
    setError('');
    let ok = 0;
    let fail = 0;
    for (const row of dirty) {
      if (!row.title.trim()) {
        fail += 1;
        continue;
      }
      try {
        const res = await fetch(
          row.id ? `/api/admin/speaking/topics/${row.id}` : '/api/admin/speaking/topics',
          {
            method: row.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'x-wewin-csrf': '1' },
            body: JSON.stringify({
              courseId: row.courseId,
              title: row.title.trim(),
              instructions: row.instructions,
              durationSeconds: row.durationSeconds,
              active: row.active,
            }),
          },
        );
        const json = await res.json();
        if (!res.ok || !json.success) fail += 1;
        else ok += 1;
      } catch {
        fail += 1;
      }
    }
    setSaving(false);
    if (fail === 0) setMessage(`Đã lưu ${ok} dòng`);
    else setError(`Lưu được ${ok}, lỗi ${fail} dòng (tiêu đề không được trống)`);
    await load();
    setExpandedKey(null);
  }

  async function toggleActive(row: TopicDraft) {
    if (!row.id) {
      patchRow(row.key, { active: !row.active });
      return;
    }
    await fetch(`/api/admin/speaking/topics/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-wewin-csrf': '1' },
      body: JSON.stringify({ active: !row.active }),
    });
    await load();
  }

  async function showPrompt(row: TopicDraft) {
    if (!row.id) return;
    setMenuKey(null);
    const response = await fetch(`/api/admin/speaking/topics/${row.id}/preview`);
    const json = await response.json();
    if (!response.ok || !json.success) {
      setError(json.message || 'Không dựng được prompt');
      return;
    }
    setPromptPreview({
      topicTitle: row.title,
      prompt: json.prompt,
      promptVersion: json.promptVersion,
      model: json.model,
    });
  }

  async function softDelete(row: TopicDraft) {
    setMenuKey(null);
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      return;
    }
    if (!confirm(`Ẩn chủ đề “${row.title}”?`)) return;
    await fetch(`/api/admin/speaking/topics/${row.id}`, {
      method: 'DELETE',
      headers: { 'x-wewin-csrf': '1' },
    });
    setMessage('Đã ẩn chủ đề');
    await load();
  }

  async function preview(row: TopicDraft) {
    if (!row.id) return;
    setMenuKey(null);
    const res = await fetch(`/api/admin/speaking/topics/${row.id}/preview`, {
      method: 'POST',
      headers: { 'x-wewin-csrf': '1' },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.message || 'Không tạo preview');
      return;
    }
    const query = new URLSearchParams({
      topicId: row.id,
      previewSession: json.session.id,
    });
    window.location.href = `/speaking/${encodeURIComponent(row.courseId)}/conversation?${query.toString()}`;
  }

  async function releaseUsage(usage: UsageRow) {
    const reason = prompt('Lý do hoàn lượt (bắt buộc):');
    if (!reason || !reason.trim()) return;
    const res = await fetch(`/api/admin/speaking/usages/${usage.id}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wewin-csrf': '1' },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.message || 'Không hoàn được lượt');
      return;
    }
    setMessage('Đã hoàn lượt');
    await load();
  }

  return (
    <AdminShell
      displayName={displayName}
      title="AI Speaking"
      subtitle="Sửa trực tiếp trên bảng · Tab / Enter như Excel · nhớ Lưu thay đổi"
    >
      <div className="speaking-pills" role="tablist" aria-label="Mục Speaking">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'speaking-pill active' : 'speaking-pill'}
            onClick={() => {
              setTab(item.id);
              setMessage('');
              setError('');
              setPromptPreview(null);
              setMenuKey(null);
            }}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="speaking-pill speaking-pill-quiet" onClick={() => void load()}>
          Tải lại
        </button>
      </div>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}
      {loading ? <DataLoading /> : null}

      {!loading && tab === 'topics' ? (
        <div>
          {promptPreview ? (
            <div className="admin-panel speaking-preview-panel">
              <div className="speaking-preview-head">
                <div>
                  <h3>Prompt — {promptPreview.topicTitle}</h3>
                  <p>
                    {promptPreview.promptVersion || '—'} · {promptPreview.model || '—'}
                  </p>
                </div>
                <button type="button" className="admin-btn" onClick={() => setPromptPreview(null)}>
                  Đóng
                </button>
              </div>
              <pre className="speaking-prompt-pre">{promptPreview.prompt}</pre>
            </div>
          ) : null}

          <div className="admin-toolbar">
            <div className="admin-toolbar-actions">
              <select
                value={filterCourseId}
                onChange={(e) => setFilterCourseId(e.target.value)}
                aria-label="Lọc khóa"
              >
                <option value="">Tất cả khóa</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.levelName} — {c.name}
                  </option>
                ))}
              </select>
              <input
                className="sheet-input"
                style={{ minWidth: 160, border: '1px solid var(--admin-border)', background: '#fff' }}
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="Tìm…"
              />
            </div>
            <div className="admin-toolbar-actions">
              <button type="button" className="admin-btn" onClick={addRow}>
                <i className="fas fa-plus" aria-hidden="true" /> Thêm dòng
              </button>
              <button
                type="button"
                className="admin-btn primary"
                disabled={saving || dirtyCount === 0}
                onClick={() => void saveDirty()}
              >
                <i className="fas fa-floppy-disk" aria-hidden="true" />{' '}
                {saving ? 'Đang lưu…' : `Lưu thay đổi${dirtyCount ? ` (${dirtyCount})` : ''}`}
              </button>
            </div>
          </div>

          <p className="sheet-keys-hint sheet-keys-hint-edit">
            Sửa ô trực tiếp · <kbd>Tab</kbd> ô kế · <kbd>Enter</kbd> xuống dòng · bấm ▶ để sửa hướng dẫn
            AI · ô vàng = chưa lưu
          </p>

          <div className="admin-panel sheet-panel">
            <div className="sheet-wrap" data-sheet-grid onKeyDown={sheetKeys.onKeyDown}>
              <table className="sheet-table speaking-sheet" style={{ minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }} />
                    <th>Khóa / Unit</th>
                    <th>Chủ đề</th>
                    <th style={{ width: 88 }}>Giây</th>
                    <th style={{ width: 72 }}>Mở</th>
                    <th style={{ width: 110 }}>Thêm</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="admin-empty">
                          Chưa có chủ đề. Bấm <strong>Thêm dòng</strong>.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, rowIndex) => (
                      <Fragment key={row.key}>
                        <tr
                          className={[
                            row.dirty ? 'sheet-row-dirty' : '',
                            expandedKey === row.key ? 'sheet-row-selected' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <td>
                            <button
                              type="button"
                              className="speaking-expand"
                              aria-label="Sửa hướng dẫn"
                              onClick={() =>
                                setExpandedKey((k) => (k === row.key ? null : row.key))
                              }
                            >
                              {expandedKey === row.key ? '▼' : '▶'}
                            </button>
                          </td>
                          <td>
                            <select
                              className="sheet-input"
                              value={row.courseId}
                              disabled={Boolean(row.id)}
                              {...sheetNav(rowIndex, 0)}
                              onChange={(e) => {
                                const course = courses.find((c) => c.id === e.target.value);
                                patchRow(row.key, {
                                  courseId: e.target.value,
                                  courseLabel: course
                                    ? `${course.levelName} — ${course.name}`
                                    : row.courseLabel,
                                });
                              }}
                            >
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.levelName} — {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              className="sheet-input"
                              value={row.title}
                              placeholder="Tên chủ đề…"
                              {...sheetNav(rowIndex, 1)}
                              onChange={(e) => patchRow(row.key, { title: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="sheet-input"
                              type="number"
                              min={60}
                              max={1800}
                              value={row.durationSeconds}
                              {...sheetNav(rowIndex, 2)}
                              onChange={(e) =>
                                patchRow(row.key, {
                                  durationSeconds: Number(e.target.value) || 300,
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              className="sheet-check"
                              checked={row.active}
                              {...sheetNav(rowIndex, 3)}
                              onChange={() => void toggleActive(row)}
                            />
                          </td>
                          <td className="speaking-more-cell">
                            <button
                              type="button"
                              className="admin-btn"
                              onClick={() =>
                                setMenuKey((k) => (k === row.key ? null : row.key))
                              }
                            >
                              ···
                            </button>
                            {menuKey === row.key ? (
                              <div className="speaking-more-menu">
                                <button type="button" onClick={() => void showPrompt(row)}>
                                  Xem prompt
                                </button>
                                <button type="button" onClick={() => void preview(row)}>
                                  Thử như học sinh
                                </button>
                                <button type="button" className="danger" onClick={() => void softDelete(row)}>
                                  Ẩn
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                        {expandedKey === row.key ? (
                          <tr className="sheet-nested-row">
                            <td colSpan={6}>
                              <label className="admin-field">
                                <span>
                                  {
                                    topicInstructionsHelp(
                                      courses.find(
                                        (course) => course.id === row.courseId,
                                      )?.levelName,
                                    ).label
                                  }
                                </span>
                                <textarea
                                  rows={4}
                                  value={row.instructions}
                                  placeholder={
                                    topicInstructionsHelp(
                                      courses.find(
                                        (course) => course.id === row.courseId,
                                      )?.levelName,
                                    ).placeholder
                                  }
                                  onChange={(e) =>
                                    patchRow(row.key, { instructions: e.target.value })
                                  }
                                />
                              </label>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'drills' ? (
        <SpeakingOperationsAdmin mode="drills" courses={courses} />
      ) : null}
      {!loading && tab === 'attempts' ? (
        <SpeakingOperationsAdmin mode="attempts" courses={courses} />
      ) : null}

      {!loading && tab === 'sessions' ? (
        <div className="admin-panel sheet-panel">
          <div className="sheet-wrap">
            <table className="admin-table speaking-table">
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Chủ đề</th>
                  <th>Trạng thái</th>
                  <th>Lỗi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.user.displayName}
                      <div className="speaking-sub">{s.user.username}</div>
                    </td>
                    <td>{s.topic?.title || s.activityType}</td>
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
          </div>
        </div>
      ) : null}

      {!loading && tab === 'usages' ? (
        <div className="admin-panel sheet-panel">
          <div className="sheet-wrap">
            <table className="admin-table speaking-table">
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Hoạt động</th>
                  <th>Đã dùng</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {usages.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.user.displayName}
                      <div className="speaking-sub">{u.user.username}</div>
                    </td>
                    <td>{u.activityType}</td>
                    <td>
                      {u.usedCount}/{u.limitSnapshot}
                    </td>
                    <td>
                      {u.usedCount > 0 ? (
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
          </div>
        </div>
      ) : null}

      {!loading && tab === 'entitlements' ? (
        <SpeakingAccessAdmin mode="entitlements" courses={courses} />
      ) : null}
      {!loading && tab === 'config' ? (
        <SpeakingAccessAdmin mode="config" courses={courses} />
      ) : null}
    </AdminShell>
  );
}
