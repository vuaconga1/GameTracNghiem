'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { assignmentDisplayTitle } from '@/lib/classHomework';
import { formatVnDateTime, toVnDateTimeLocalInput } from '@/lib/vnDateTime';

type StudentOption = {
  id: string;
  displayName: string;
  username: string;
};

type Member = StudentOption & {
  userId: string;
  joinedAt: string;
};

type Assignment = {
  id: string;
  courseId: string;
  gameKey: string;
  skillId: string | null;
  levelName: string;
  courseName: string;
  gameLabel: string;
  skillLabel: string | null;
  deadlineAt: string;
};

type ProgressRow = {
  userId: string;
  displayName: string;
  username: string;
  status: 'done' | 'pending';
  statusLabel: string;
  correctDisplay: string;
  scoreDisplay: string;
  attemptCount: number;
  submittedAtDisplay: string;
  isLate: boolean | null;
};

type ProgressAssignment = Assignment & {
  totalQuestions?: number;
  rows: ProgressRow[];
};

type CatalogGame = { key: string; label: string; slug: string };
type CatalogSkill = {
  id: string;
  label: string;
  shortLabel: string;
  games: CatalogGame[];
};
type CatalogCourse = {
  id: string;
  name: string;
  levelName: string;
  skills: CatalogSkill[];
  orphanGames: CatalogGame[];
};
type CatalogLevel = { levelName: string; courses: CatalogCourse[] };

type DraftAssignment = {
  key: string;
  levelName: string;
  courseId: string;
  skillId: string;
  gameKey: string;
  deadlineAt: string;
};

function defaultDeadlineLocal(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return toVnDateTimeLocalInput(d);
}

function emptyDraft(): DraftAssignment {
  return {
    key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    levelName: '',
    courseId: '',
    skillId: '',
    gameKey: '',
    deadlineAt: defaultDeadlineLocal(),
  };
}

export function ClassDetailAdmin({
  classId,
  displayName,
  isAdmin,
}: {
  classId: string;
  displayName: string;
  isAdmin: boolean;
}) {
  const [className, setClassName] = useState('');
  const [members, setMembers] = useState<Member[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [progress, setProgress] = useState<ProgressAssignment[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogLevel[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [searching, setSearching] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [drafts, setDrafts] = useState<DraftAssignment[]>([emptyDraft()]);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/classes/${classId}`);
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không tải được lớp');
      return;
    }
    setClassName(data.item.name);
    setMembers(
      (data.item.members as Array<{
        userId: string;
        displayName: string;
        username: string;
        joinedAt: string;
      }>).map((m) => ({
        id: m.userId,
        userId: m.userId,
        displayName: m.displayName,
        username: m.username,
        joinedAt: m.joinedAt,
      }))
    );
    setAssignments(data.item.assignments);
    setProgress(data.item.progress?.assignments || []);
    setError('');
  }, [classId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/classes/catalog');
      const data = await res.json();
      if (data.success) setCatalog(data.items as CatalogLevel[]);
    })();
  }, []);

  useEffect(() => {
    const q = studentQuery.trim();
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/admin/classes/students?q=${encodeURIComponent(q)}&limit=30`
          );
          const data = await res.json();
          if (data.success) {
            const inClass = new Set((members || []).map((m) => m.userId || m.id));
            const options = (data.items as StudentOption[]).filter(
              (s) => !inClass.has(s.id)
            );
            setStudentOptions(options);
          }
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [studentQuery, members]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const memberIds = useMemo(
    () => new Set((members || []).map((m) => m.userId || m.id)),
    [members]
  );

  const selectedIds = useMemo(
    () => new Set(selectedStudents.map((s) => s.id)),
    [selectedStudents]
  );

  // Drop selections that are already in the class (e.g. after a successful add)
  useEffect(() => {
    setSelectedStudents((prev) => {
      const next = prev.filter((s) => !memberIds.has(s.id));
      return next.length === prev.length ? prev : next;
    });
  }, [memberIds]);

  function toggleStudent(student: StudentOption) {
    setSelectedStudents((prev) =>
      prev.some((s) => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student]
    );
  }

  async function addStudent(event: React.FormEvent) {
    event.preventDefault();
    const userIds = selectedStudents
      .map((s) => s.id)
      .filter((id) => !memberIds.has(id));
    if (!userIds.length || addingStudent) return;
    setAddingStudent(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/admin/classes/${classId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không thêm được học viên');
        return;
      }
      setSelectedStudents([]);
      setStudentQuery('');
      setPickerOpen(false);
      setMessage(
        userIds.length === 1
          ? 'Đã thêm học viên vào lớp'
          : `Đã thêm ${userIds.length} học viên vào lớp`
      );
      await load();
    } finally {
      setAddingStudent(false);
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Gỡ ${member.displayName} khỏi lớp?`)) return;
    const res = await fetch(`/api/admin/classes/${classId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: member.userId || member.id }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không gỡ được học viên');
      return;
    }
    setMessage(`Đã gỡ ${member.displayName}`);
    await load();
  }

  function updateDraft(key: string, patch: Partial<DraftAssignment>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function coursesForLevel(levelName: string) {
    return catalog?.find((l) => l.levelName === levelName)?.courses || [];
  }

  function courseById(courseId: string) {
    for (const level of catalog || []) {
      const found = level.courses.find((c) => c.id === courseId);
      if (found) return found;
    }
    return null;
  }

  function gamesForDraft(draft: DraftAssignment): CatalogGame[] {
    const course = courseById(draft.courseId);
    if (!course) return [];
    if (draft.skillId === '__other__') return course.orphanGames;
    const skill = course.skills.find((s) => s.id === draft.skillId);
    return skill?.games || [];
  }

  async function submitAssignments(event: React.FormEvent) {
    event.preventDefault();
    const payload = drafts
      .filter((d) => d.courseId && d.gameKey && d.deadlineAt)
      .map((d) => ({
        courseId: d.courseId,
        gameKey: d.gameKey,
        skillId: d.skillId && d.skillId !== '__other__' ? d.skillId : null,
        deadlineAt: d.deadlineAt,
      }));

    if (!payload.length) {
      setError('Chọn ít nhất một bài tập đầy đủ (unit → phần → game → hạn nộp)');
      return;
    }

    setAssigning(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/classes/${classId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: payload }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không giao được bài tập');
        return;
      }
      setDrafts([emptyDraft()]);
      setMessage(`Đã giao ${payload.length} bài tập`);
      await load();
    } finally {
      setAssigning(false);
    }
  }

  async function deleteAssignment(assignment: Assignment) {
    const title = assignmentDisplayTitle({
      courseName: assignment.courseName,
      gameLabel: assignment.gameLabel,
      skillLabel: assignment.skillLabel,
    });
    if (!window.confirm(`Xóa bài tập “${title}”?`)) return;
    const res = await fetch(
      `/api/admin/classes/${classId}/assignments/${assignment.id}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không xóa được bài tập');
      return;
    }
    setMessage('Đã xóa bài tập');
    await load();
  }

  const loading = members === null || assignments === null;

  return (
    <AdminShell
      displayName={displayName}
      title={className || 'Chi tiết lớp'}
      subtitle="Học viên · giao bài · theo dõi tiến độ"
      isAdmin={isAdmin}
    >
      <div className="admin-toolbar">
        <Link className="admin-btn" href="/admin/classes">
          ← Danh sách lớp
        </Link>
      </div>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      {loading ? (
        <DataLoading />
      ) : (
        <>
          <section className="admin-panel" style={{ marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>Học viên ({members.length})</h2>
            <form
              className="admin-toolbar"
              onSubmit={(e) => void addStudent(e)}
              style={{ marginBottom: 12 }}
            >
              <div
                className="admin-toolbar-actions class-student-add"
                style={{ flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}
              >
                <div className="class-student-picker" ref={pickerRef}>
                  {selectedStudents.length > 0 ? (
                    <div className="class-student-chips" aria-label="Học viên đã chọn">
                      {selectedStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="class-student-chip"
                          onClick={() => toggleStudent(s)}
                          title="Bỏ chọn"
                        >
                          {s.displayName}
                          <span aria-hidden="true">×</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <input
                    className="admin-toolbar-input class-student-picker-input"
                    placeholder="Gõ tên để tìm học viên…"
                    value={studentQuery}
                    onChange={(e) => {
                      setStudentQuery(e.target.value);
                      setPickerOpen(true);
                    }}
                    onFocus={() => setPickerOpen(true)}
                    aria-label="Tìm học viên"
                    autoComplete="off"
                  />
                  {pickerOpen ? (
                    <div
                      className="class-student-picker-menu"
                      role="listbox"
                      aria-multiselectable="true"
                    >
                      {searching ? (
                        <div className="class-student-picker-empty">đang tải dữ liệu</div>
                      ) : studentOptions.length === 0 ? (
                        <div className="class-student-picker-empty">
                          {studentQuery.trim()
                            ? 'Không tìm thấy học viên phù hợp'
                            : 'Gõ tên để tìm học viên…'}
                        </div>
                      ) : (
                        studentOptions.map((s) => {
                          const checked = selectedIds.has(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`class-student-option${checked ? ' is-selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleStudent(s)}
                              />
                              <span className="class-student-option-text">
                                <strong>{s.displayName}</strong>
                                <span className="muted">@{s.username}</span>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={selectedStudents.length === 0 || addingStudent}
                >
                  {addingStudent
                    ? 'Đang thêm…'
                    : selectedStudents.length > 1
                      ? `Thêm vào lớp (${selectedStudents.length})`
                      : 'Thêm vào lớp'}
                </button>
              </div>
            </form>

            {members.length === 0 ? (
              <div className="admin-empty">Chưa có học viên trong lớp.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Username</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.userId || m.id}>
                        <td>{m.displayName}</td>
                        <td>{m.username}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn danger"
                            onClick={() => void removeMember(m)}
                          >
                            Gỡ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-panel" style={{ marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>Giao bài tập</h2>
            {!catalog ? (
              <DataLoading />
            ) : (
              <form onSubmit={(e) => void submitAssignments(e)}>
                {drafts.map((draft, index) => {
                  const courses = coursesForLevel(draft.levelName);
                  const course = courseById(draft.courseId);
                  const games = gamesForDraft(draft);
                  return (
                    <div
                      key={draft.key}
                      className="class-assign-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: 8,
                        marginBottom: 10,
                        alignItems: 'end',
                      }}
                    >
                      <label>
                        <span className="muted">Cấp / lớp</span>
                        <select
                          className="sheet-input"
                          value={draft.levelName}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              levelName: e.target.value,
                              courseId: '',
                              skillId: '',
                              gameKey: '',
                            })
                          }
                        >
                          <option value="">Chọn…</option>
                          {(catalog || []).map((l) => (
                            <option key={l.levelName} value={l.levelName}>
                              {l.levelName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="muted">Unit</span>
                        <select
                          className="sheet-input"
                          value={draft.courseId}
                          disabled={!draft.levelName}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              courseId: e.target.value,
                              skillId: '',
                              gameKey: '',
                            })
                          }
                        >
                          <option value="">Chọn…</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="muted">Phần</span>
                        <select
                          className="sheet-input"
                          value={draft.skillId}
                          disabled={!draft.courseId}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              skillId: e.target.value,
                              gameKey: '',
                            })
                          }
                        >
                          <option value="">Chọn…</option>
                          {(course?.skills || [])
                            .filter((s) => s.games.length > 0)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.shortLabel}
                              </option>
                            ))}
                          {(course?.orphanGames?.length || 0) > 0 ? (
                            <option value="__other__">Khác</option>
                          ) : null}
                        </select>
                      </label>
                      <label>
                        <span className="muted">Game</span>
                        <select
                          className="sheet-input"
                          value={draft.gameKey}
                          disabled={!draft.skillId}
                          onChange={(e) =>
                            updateDraft(draft.key, { gameKey: e.target.value })
                          }
                        >
                          <option value="">Chọn…</option>
                          {games.map((g) => (
                            <option key={g.key} value={g.key}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="muted">Hạn nộp</span>
                        <input
                          type="datetime-local"
                          className="sheet-input"
                          value={draft.deadlineAt}
                          onChange={(e) =>
                            updateDraft(draft.key, { deadlineAt: e.target.value })
                          }
                        />
                      </label>
                      <div>
                        {drafts.length > 1 ? (
                          <button
                            type="button"
                            className="admin-btn danger"
                            onClick={() =>
                              setDrafts((prev) => prev.filter((d) => d.key !== draft.key))
                            }
                          >
                            Xóa dòng {index + 1}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div className="admin-toolbar-actions" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
                  >
                    + Thêm bài tập
                  </button>
                  <button type="submit" className="admin-btn primary" disabled={assigning}>
                    {assigning ? 'Đang giao…' : 'Giao bài đã chọn'}
                  </button>
                </div>
              </form>
            )}

            {assignments && assignments.length > 0 ? (
              <div className="admin-table-wrap" style={{ marginTop: 16 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Bài tập</th>
                      <th>Hạn nộp</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {a.levelName} ·{' '}
                          {assignmentDisplayTitle({
                            courseName: a.courseName,
                            gameLabel: a.gameLabel,
                            skillLabel: a.skillLabel,
                          })}
                        </td>
                        <td>{formatVnDateTime(a.deadlineAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn danger"
                            onClick={() => void deleteAssignment(a)}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="admin-panel">
            <h2 style={{ marginTop: 0 }}>Tiến độ bài tập</h2>
            {!progress || progress.length === 0 ? (
              <div className="admin-empty">
                {memberIds.size === 0
                  ? 'Thêm học viên và giao bài để xem tiến độ.'
                  : 'Chưa có bài tập được giao.'}
              </div>
            ) : (
              progress.map((block) => (
                <div key={block.id} style={{ marginBottom: 22 }}>
                  <h3 style={{ marginBottom: 6 }}>
                    {assignmentDisplayTitle({
                      courseName: block.courseName,
                      gameLabel: block.gameLabel,
                      skillLabel: block.skillLabel,
                    })}
                  </h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Hạn nộp: {formatVnDateTime(block.deadlineAt)}
                    {typeof block.totalQuestions === 'number'
                      ? ` · ${block.totalQuestions} câu`
                      : ''}
                  </p>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Học viên</th>
                          <th>Trạng thái</th>
                          <th>Đúng</th>
                          <th>Điểm /10</th>
                          <th>Số lần làm</th>
                          <th>Thời gian nộp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row) => (
                          <tr key={`${block.id}-${row.userId}`}>
                            <td>{row.displayName}</td>
                            <td>{row.statusLabel}</td>
                            <td>{row.correctDisplay}</td>
                            <td>{row.scoreDisplay}</td>
                            <td>{row.attemptCount}</td>
                            <td>
                              {row.submittedAtDisplay === '—' ? (
                                '—'
                              ) : (
                                <span
                                  style={{
                                    color: row.isLate ? '#c62828' : '#2e7d32',
                                    fontWeight: 700,
                                  }}
                                >
                                  {row.submittedAtDisplay}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
