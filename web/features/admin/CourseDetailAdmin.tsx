'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { parseCourseGameLessonRange } from '@/lib/courseGameLesson';
import {
  buildRemoveGameLessonRequest,
  buildSaveGameLessonRequest,
} from '@/lib/courseGameLessonRequest';
import { parseCourseSkillLessonRange } from '@/lib/courseSkillLesson';
import {
  buildRemoveSkillLessonRequest,
  buildSaveSkillLessonRequest,
} from '@/lib/courseSkillLessonRequest';
import {
  compactSkillAssignment,
  deriveEnabledGamesFromSkills,
  MULTI_SKILL_GAME_KEYS,
  resolveEnabledSkillIds,
  resolveGameSkillsMap,
  SKILL_CATALOG,
  SKILL_IDS,
  skillsForGame,
  type GameSkillAssignment,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';

import {
  CourseGameLessonEditor,
  type CourseGameLessonEditorValue,
} from './CourseGameLessonEditor';

type GameCard = {
  key: string;
  slug: string;
  label: string;
  icon: string;
  questionCount: number;
};

type CourseGameLesson = {
  id: string;
  courseId: string;
  gameKey: string;
  pageStart: number;
  pageEnd: number;
};

type CourseSkillLesson = {
  id: string;
  courseId: string;
  skillId: string;
  pageStart: number;
  pageEnd: number;
};

type Course = {
  id: string;
  name: string;
  levelName: string;
  active: boolean;
  enabledGames?: string[];
  gameSkills?: GameSkillsMap;
  enabledSkills?: SkillId[];
  ebookFileId?: string | null;
  ebookPageStart?: number | null;
  ebookPageEnd?: number | null;
  gameLessons?: CourseGameLesson[];
  skillLessons?: CourseSkillLesson[];
};

type EbookOption = {
  id: string;
  title: string;
  pageCount: number | null;
  active: boolean;
};

function skillSelectValue(assignment: GameSkillAssignment | undefined): string {
  const skills = skillsForGame(assignment);
  return skills[0] ?? '';
}

function assignmentIsVisible(
  assignment: GameSkillAssignment | undefined,
  enabledSkills: SkillId[]
): boolean {
  return skillsForGame(assignment).some((id) => enabledSkills.includes(id));
}

export function CourseDetailAdmin({
  displayName,
  courseId,
}: {
  displayName: string;
  courseId: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [games, setGames] = useState<GameCard[]>([]);
  const [ebooks, setEbooks] = useState<EbookOption[]>([]);
  const [gameSkills, setGameSkills] = useState<GameSkillsMap>({});
  const [enabledSkills, setEnabledSkills] = useState<SkillId[]>([...SKILL_IDS]);
  const [ebookId, setEbookId] = useState('');
  const [pageStart, setPageStart] = useState('');
  const [pageEnd, setPageEnd] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingSkills, setSavingSkills] = useState(false);
  const [savingGameLessonKeys, setSavingGameLessonKeys] = useState<Set<string>>(new Set());
  const [savingSkillLessonIds, setSavingSkillLessonIds] = useState<Set<string>>(new Set());
  const [savingLesson, setSavingLesson] = useState(false);
  const [gameLessonDrafts, setGameLessonDrafts] = useState<
    Record<string, Omit<CourseGameLessonEditorValue, 'saved'>>
  >({});
  const [skillLessonDrafts, setSkillLessonDrafts] = useState<
    Record<string, Omit<CourseGameLessonEditorValue, 'saved'>>
  >({});

  const applyCourseSkillState = useCallback((nextCourse: Course) => {
    const map = resolveGameSkillsMap(nextCourse.gameSkills, nextCourse.enabledGames);
    const skills = resolveEnabledSkillIds(nextCourse.enabledSkills);
    setGameSkills(map);
    setEnabledSkills(skills);
  }, []);

  const load = useCallback(async () => {
    const [courseRes, ebooksRes] = await Promise.all([
      fetch(`/api/admin/courses/${courseId}`),
      fetch('/api/admin/ebooks'),
    ]);
    const data = await courseRes.json();
    const ebooksData = await ebooksRes.json();
    if (!data.success) {
      setError(data.message || 'Không tải được khóa học');
      return;
    }
    const nextCourse = data.course as Course;
    setCourse(nextCourse);
    setGames(data.games as GameCard[]);
    applyCourseSkillState(nextCourse);
    setEbookId(nextCourse.ebookFileId || '');
    setPageStart(
      nextCourse.ebookPageStart != null ? String(nextCourse.ebookPageStart) : ''
    );
    setPageEnd(nextCourse.ebookPageEnd != null ? String(nextCourse.ebookPageEnd) : '');
    setGameLessonDrafts(
      Object.fromEntries(
        (nextCourse.gameLessons || []).map((lesson) => [
          lesson.gameKey,
          {
            pageStart: String(lesson.pageStart),
            pageEnd: String(lesson.pageEnd),
          },
        ])
      )
    );
    setSkillLessonDrafts(
      Object.fromEntries(
        (nextCourse.skillLessons || []).map((lesson) => [
          lesson.skillId,
          {
            pageStart: String(lesson.pageStart),
            pageEnd: String(lesson.pageEnd),
          },
        ])
      )
    );
    if (ebooksData.success) {
      setEbooks(
        (ebooksData.items as EbookOption[]).filter((item) => item.active !== false)
      );
    }
    setError('');
  }, [applyCourseSkillState, courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleCount = useMemo(
    () => deriveEnabledGamesFromSkills(gameSkills, enabledSkills).length,
    [gameSkills, enabledSkills]
  );

  async function patchSkills(nextMap: GameSkillsMap, nextEnabled: SkillId[]) {
    const res = await fetch(`/api/admin/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameSkills: nextMap,
        enabledSkills: nextEnabled,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Không lưu được cấu hình kỹ năng');
    }
    const item = data.item as Course;
    setCourse((prev) =>
      prev
        ? {
            ...prev,
            gameSkills: item.gameSkills,
            enabledSkills: item.enabledSkills,
            enabledGames: item.enabledGames,
          }
        : prev
    );
    applyCourseSkillState(item);
    return item;
  }

  async function setGameSkill(gameKey: string, skill: GameSkillAssignment) {
    if (!course || savingKey) return;

    const previous = gameSkills;
    const next: GameSkillsMap = { ...gameSkills, [gameKey]: skill };
    setGameSkills(next);
    setSavingKey(gameKey);
    setMessage('');
    setError('');

    try {
      await patchSkills(next, enabledSkills);
      const label = games.find((g) => g.key === gameKey)?.label || gameKey;
      const assigned = skillsForGame(skill);
      const skillLabel =
        assigned.length === 0
          ? 'Ẩn'
          : assigned
              .map((id) => SKILL_CATALOG.find((s) => s.id === id)?.shortLabel || id)
              .join(', ');
      setMessage(`Đã gán “${label}” → ${skillLabel}`);
    } catch (err) {
      setGameSkills(previous);
      setError(err instanceof Error ? err.message : 'Lỗi mạng khi lưu kỹ năng game');
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleQuizSkill(skillId: SkillId, nextOn: boolean) {
    if (!course || savingKey) return;
    const current = new Set(skillsForGame(gameSkills.quiz));
    if (nextOn) current.add(skillId);
    else current.delete(skillId);
    const nextSkills = SKILL_IDS.filter((id) => current.has(id));
    await setGameSkill('quiz', compactSkillAssignment(nextSkills, true));
  }

  async function toggleSkillEnabled(skillId: SkillId, nextOn: boolean) {
    if (!course || savingSkills) return;

    const previous = enabledSkills;
    const next = nextOn
      ? SKILL_IDS.filter((id) => previous.includes(id) || id === skillId)
      : previous.filter((id) => id !== skillId);
    setEnabledSkills(next);
    setSavingSkills(true);
    setMessage('');
    setError('');

    try {
      await patchSkills(gameSkills, next);
      const label = SKILL_CATALOG.find((s) => s.id === skillId)?.shortLabel || skillId;
      setMessage(nextOn ? `Đã bật kỹ năng ${label}` : `Đã tắt kỹ năng ${label} với học sinh`);
    } catch (err) {
      setEnabledSkills(previous);
      setError(err instanceof Error ? err.message : 'Lỗi mạng khi lưu kỹ năng');
    } finally {
      setSavingSkills(false);
    }
  }

  async function saveLessonLink() {
    setSavingLesson(true);
    setError('');
    setMessage('');
    try {
      const start = pageStart.trim() === '' ? null : Number(pageStart);
      const end = pageEnd.trim() === '' ? null : Number(pageEnd);
      if (start != null && (!Number.isFinite(start) || start < 1)) {
        setError('Trang bắt đầu phải ≥ 1');
        return;
      }
      if (end != null && (!Number.isFinite(end) || end < 1)) {
        setError('Trang kết thúc phải ≥ 1');
        return;
      }
      if (start != null && end != null && end < start) {
        setError('Trang kết thúc phải ≥ trang bắt đầu');
        return;
      }

      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ebookFileId: ebookId || null,
          ebookPageStart: start,
          ebookPageEnd: end,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không lưu được phần bài học');
        return;
      }
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              ebookFileId: data.item.ebookFileId,
              ebookPageStart: data.item.ebookPageStart,
              ebookPageEnd: data.item.ebookPageEnd,
            }
          : prev
      );
      setMessage('Đã lưu liên kết sách bài học');
    } catch {
      setError('Lỗi mạng khi lưu bài học');
    } finally {
      setSavingLesson(false);
    }
  }

  async function saveGameLesson(game: GameCard) {
    if (!course || savingGameLessonKeys.has(game.key)) return;

    const draft = gameLessonDrafts[game.key] || { pageStart: '', pageEnd: '' };
    const range = parseCourseGameLessonRange(draft, null);
    if (!range.ok) {
      setMessage('');
      setError(range.message);
      return;
    }

    setSavingGameLessonKeys((prev) => new Set(prev).add(game.key));
    setMessage('');
    setError('');
    try {
      const { url, init } = buildSaveGameLessonRequest(courseId, game.key, range.value);
      const res = await fetch(url, init);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không lưu được bài học PDF của game');
        return;
      }

      const saved = data.item as CourseGameLesson;
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              gameLessons: [
                ...(prev.gameLessons || []).filter((item) => item.gameKey !== game.key),
                saved,
              ],
            }
          : prev
      );
      setGameLessonDrafts((prev) => ({
        ...prev,
        [game.key]: {
          pageStart: String(saved.pageStart),
          pageEnd: String(saved.pageEnd),
        },
      }));
      setMessage(`Đã lưu bài học PDF cho “${game.label}”`);
    } catch {
      setError('Lỗi mạng khi lưu bài học PDF của game');
    } finally {
      setSavingGameLessonKeys((prev) => {
        const next = new Set(prev);
        next.delete(game.key);
        return next;
      });
    }
  }

  async function removeGameLesson(game: GameCard) {
    if (!course || savingGameLessonKeys.has(game.key)) return;

    setSavingGameLessonKeys((prev) => new Set(prev).add(game.key));
    setMessage('');
    setError('');
    try {
      const { url, init } = buildRemoveGameLessonRequest(courseId, game.key);
      const res = await fetch(url, init);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không gỡ được bài học PDF của game');
        return;
      }

      setCourse((prev) =>
        prev
          ? {
              ...prev,
              gameLessons: (prev.gameLessons || []).filter(
                (item) => item.gameKey !== game.key
              ),
            }
          : prev
      );
      setGameLessonDrafts((prev) => ({
        ...prev,
        [game.key]: { pageStart: '', pageEnd: '' },
      }));
      setMessage(`Đã gỡ bài học PDF khỏi “${game.label}”`);
    } catch {
      setError('Lỗi mạng khi gỡ bài học PDF của game');
    } finally {
      setSavingGameLessonKeys((prev) => {
        const next = new Set(prev);
        next.delete(game.key);
        return next;
      });
    }
  }

  async function saveSkillLesson(skill: (typeof SKILL_CATALOG)[number]) {
    if (!course || savingSkillLessonIds.has(skill.id)) return;

    const draft = skillLessonDrafts[skill.id] || { pageStart: '', pageEnd: '' };
    const range = parseCourseSkillLessonRange(draft, null);
    if (!range.ok) {
      setMessage('');
      setError(range.message);
      return;
    }

    setSavingSkillLessonIds((prev) => new Set(prev).add(skill.id));
    setMessage('');
    setError('');
    try {
      const { url, init } = buildSaveSkillLessonRequest(courseId, skill.id, range.value);
      const res = await fetch(url, init);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không lưu được bài học PDF của kỹ năng');
        return;
      }

      const saved = data.item as CourseSkillLesson;
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              skillLessons: [
                ...(prev.skillLessons || []).filter((item) => item.skillId !== skill.id),
                saved,
              ],
            }
          : prev
      );
      setSkillLessonDrafts((prev) => ({
        ...prev,
        [skill.id]: {
          pageStart: String(saved.pageStart),
          pageEnd: String(saved.pageEnd),
        },
      }));
      setMessage(`Đã lưu bài học PDF cho kỹ năng “${skill.shortLabel}”`);
    } catch {
      setError('Lỗi mạng khi lưu bài học PDF của kỹ năng');
    } finally {
      setSavingSkillLessonIds((prev) => {
        const next = new Set(prev);
        next.delete(skill.id);
        return next;
      });
    }
  }

  async function removeSkillLesson(skill: (typeof SKILL_CATALOG)[number]) {
    if (!course || savingSkillLessonIds.has(skill.id)) return;

    setSavingSkillLessonIds((prev) => new Set(prev).add(skill.id));
    setMessage('');
    setError('');
    try {
      const { url, init } = buildRemoveSkillLessonRequest(courseId, skill.id);
      const res = await fetch(url, init);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không gỡ được bài học PDF của kỹ năng');
        return;
      }

      setCourse((prev) =>
        prev
          ? {
              ...prev,
              skillLessons: (prev.skillLessons || []).filter(
                (item) => item.skillId !== skill.id
              ),
            }
          : prev
      );
      setSkillLessonDrafts((prev) => ({
        ...prev,
        [skill.id]: { pageStart: '', pageEnd: '' },
      }));
      setMessage(`Đã gỡ bài học PDF khỏi kỹ năng “${skill.shortLabel}”`);
    } catch {
      setError('Lỗi mạng khi gỡ bài học PDF của kỹ năng');
    } finally {
      setSavingSkillLessonIds((prev) => {
        const next = new Set(prev);
        next.delete(skill.id);
        return next;
      });
    }
  }

  return (
    <AdminShell
      displayName={displayName}
      title={course ? `Khóa: ${course.name}` : 'Chi tiết khóa học'}
    >
      <div className="admin-toolbar">
        <Link className="admin-btn" href="/admin/courses">
          ← Danh sách khóa học
        </Link>
        <Link className="admin-btn" href="/admin/ebooks">
          Quản lý sách PDF
        </Link>
      </div>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      {!course ? (
        <DataLoading />
      ) : (
        <>
          <div className="admin-panel course-detail-header">
            <div className="course-detail-title-row">
              <div>
                <h2 className="course-detail-name">
                  {course.name}
                  <span className="course-detail-level"> · {course.levelName}</span>
                </h2>
                <p className="course-detail-meta">
                  {visibleCount}/{games.length} game hiện với học sinh · Gắn sách PDF cho tab Bài
                  học bên dưới.
                </p>
              </div>
              <span className={`admin-badge ${course.active ? 'on' : 'off'}`}>
                {course.active ? 'Đang dùng' : 'Đã ẩn'}
              </span>
            </div>
          </div>

          <div className="admin-panel" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Kỹ năng hiện với học sinh</h3>
            <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              Tắt kỹ năng = ẩn thẻ kỹ năng đó trên tab Bài tập. Game vẫn có thể gán kỹ năng để
              bật lại sau.
            </p>
            <div className="admin-toolbar" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {SKILL_CATALOG.map((skill) => {
                const on = enabledSkills.includes(skill.id);
                return (
                  <label key={skill.id} className="course-game-switch" style={{ marginRight: 12 }}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={savingSkills}
                      onChange={(e) => void toggleSkillEnabled(skill.id, e.target.checked)}
                      aria-label={`${on ? 'Tắt' : 'Bật'} kỹ năng ${skill.shortLabel}`}
                    />
                    <span className="course-game-switch-ui" aria-hidden="true" />
                    <span className="course-game-switch-text">
                      {skill.shortLabel}
                      {savingSkills ? '…' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="admin-panel" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Bài học (PDF)</h3>
            <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              Chọn sách và khoảng trang mặc định của unit. Học sinh thấy khoảng này khi mở Bài học
              từ root unit (chưa chọn kỹ năng). Khoảng theo kỹ năng cấu hình bên dưới.
            </p>
            <div className="admin-toolbar" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <select
                value={ebookId}
                onChange={(e) => setEbookId(e.target.value)}
                style={{ minWidth: 220 }}
              >
                <option value="">— Không gắn sách —</option>
                {ebooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                    {book.pageCount ? ` (${book.pageCount} trang)` : ''}
                  </option>
                ))}
              </select>
              <input
                className="sheet-input"
                style={{ width: 110, border: '1px solid var(--admin-border)', background: '#fff' }}
                type="number"
                min={1}
                placeholder="Trang từ"
                value={pageStart}
                onChange={(e) => setPageStart(e.target.value)}
              />
              <input
                className="sheet-input"
                style={{ width: 110, border: '1px solid var(--admin-border)', background: '#fff' }}
                type="number"
                min={1}
                placeholder="Trang đến"
                value={pageEnd}
                onChange={(e) => setPageEnd(e.target.value)}
              />
              <button
                type="button"
                className="admin-btn primary"
                disabled={savingLesson}
                onClick={() => void saveLessonLink()}
              >
                {savingLesson ? 'Đang lưu...' : 'Lưu bài học'}
              </button>
            </div>
            {ebooks.length === 0 ? (
              <p className="help" style={{ color: 'var(--admin-muted)', marginBottom: 0 }}>
                Chưa có sách. Vào <Link href="/admin/ebooks">Sách bài tập</Link> để upload PDF.
              </p>
            ) : null}
          </div>

          <div className="admin-panel" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
              Trang bài học theo kỹ năng
            </h3>
            <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              Gán khoảng trang (hoặc 1 trang) trong PDF trên cho từng kỹ năng. Học sinh mở Bài học
              khi đã chọn kỹ năng (`?skill=`) chỉ thấy khoảng này — chưa gán thì hiện thông báo
              trống, không hiện cả unit.
            </p>
            <div
              className="course-game-list course-skill-lesson-list"
              role="table"
              aria-label="Bài học PDF theo kỹ năng"
            >
              <div className="course-game-list-head" role="row">
                <span role="columnheader">Kỹ năng</span>
                <span role="columnheader">Bài học PDF</span>
              </div>
              {SKILL_CATALOG.map((skill) => {
                const savedLesson = course.skillLessons?.find(
                  (lesson) => lesson.skillId === skill.id
                );
                const lessonDraft = skillLessonDrafts[skill.id] || {
                  pageStart: '',
                  pageEnd: '',
                };
                return (
                  <div key={skill.id} className="course-game-row" role="row">
                    <div className="course-game-main" role="cell">
                      <span className="course-game-icon" aria-hidden="true">
                        <i className={skill.icon} />
                      </span>
                      <div>
                        <strong>{skill.shortLabel}</strong>
                      </div>
                    </div>
                    <div className="course-game-lesson" role="cell">
                      <CourseGameLessonEditor
                        game={{ key: skill.id, label: skill.shortLabel }}
                        ebookAvailable={Boolean(course.ebookFileId)}
                        value={{ ...lessonDraft, saved: Boolean(savedLesson) }}
                        busy={savingSkillLessonIds.has(skill.id)}
                        onChange={({ pageStart: nextStart, pageEnd: nextEnd }) =>
                          setSkillLessonDrafts((prev) => ({
                            ...prev,
                            [skill.id]: {
                              pageStart: nextStart,
                              pageEnd: nextEnd,
                            },
                          }))
                        }
                        onSave={() => void saveSkillLesson(skill)}
                        onRemove={() => void removeSkillLesson(skill)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="admin-panel course-game-panel">
            <div className="course-game-panel-head">
              <h3>Danh sách game</h3>
            </div>
            <p className="help" style={{ color: 'var(--admin-muted)', margin: '0 0 0.75rem' }}>
              Hầu hết game thuộc tối đa một kỹ năng (hoặc Ẩn). Trắc nghiệm có thể gán nhiều kỹ năng.
              Học sinh thấy game khi ít nhất một kỹ năng được gán đang bật.
            </p>

            <div className="course-game-list" role="table" aria-label="Danh sách game của khóa">
              <div className="course-game-list-head" role="row">
                <span role="columnheader">Game</span>
                <span role="columnheader">Số câu / bài</span>
                <span role="columnheader">Kỹ năng</span>
                <span role="columnheader">Bài học PDF</span>
                <span role="columnheader">Thao tác</span>
              </div>

              {games.map((game) => {
                const assignment = gameSkills[game.key] ?? null;
                const assignedSkills = skillsForGame(assignment);
                const isOn = assignmentIsVisible(assignment, enabledSkills);
                const busy = savingKey === game.key;
                const multiSkill = MULTI_SKILL_GAME_KEYS.has(game.key);
                const savedLesson = course.gameLessons?.find(
                  (lesson) => lesson.gameKey === game.key
                );
                const lessonDraft = gameLessonDrafts[game.key] || {
                  pageStart: '',
                  pageEnd: '',
                };
                return (
                  <div
                    key={game.key}
                    className={`course-game-row${isOn ? '' : ' is-off'}`}
                    role="row"
                  >
                    <div className="course-game-main" role="cell">
                      <span className="course-game-icon" aria-hidden="true">
                        <i className={game.icon} />
                      </span>
                      <div>
                        <strong>{game.label}</strong>
                        <span className="course-game-count-mobile">
                          {game.questionCount} câu / bài
                        </span>
                      </div>
                    </div>
                    <div className="course-game-count" role="cell">
                      {game.questionCount}
                    </div>
                    <div className="course-game-visible" role="cell">
                      {multiSkill ? (
                        <div
                          className="course-game-skill-multi"
                          role="group"
                          aria-label={`Kỹ năng cho ${game.label}`}
                        >
                          {SKILL_CATALOG.map((skill) => {
                            const checked = assignedSkills.includes(skill.id);
                            return (
                              <label
                                key={skill.id}
                                className="course-game-switch"
                                style={{ marginRight: 8, display: 'inline-flex' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={busy}
                                  onChange={(e) =>
                                    void toggleQuizSkill(skill.id, e.target.checked)
                                  }
                                />
                                <span className="course-game-switch-text">{skill.shortLabel}</span>
                              </label>
                            );
                          })}
                          {busy ? <span className="course-game-switch-text"> …</span> : null}
                        </div>
                      ) : (
                        <>
                          <select
                            className="course-game-skill-select"
                            value={skillSelectValue(assignment)}
                            disabled={busy}
                            aria-label={`Kỹ năng cho ${game.label}`}
                            onChange={(e) => {
                              const value = e.target.value;
                              void setGameSkill(
                                game.key,
                                value === '' ? null : (value as SkillId)
                              );
                            }}
                          >
                            <option value="">Ẩn</option>
                            {SKILL_CATALOG.map((skill) => (
                              <option key={skill.id} value={skill.id}>
                                {skill.shortLabel}
                              </option>
                            ))}
                          </select>
                          {busy ? <span className="course-game-switch-text"> …</span> : null}
                        </>
                      )}
                    </div>
                    <div className="course-game-lesson" role="cell">
                      <CourseGameLessonEditor
                        game={game}
                        ebookAvailable={Boolean(course.ebookFileId)}
                        value={{ ...lessonDraft, saved: Boolean(savedLesson) }}
                        busy={savingGameLessonKeys.has(game.key)}
                        onChange={({ pageStart: nextStart, pageEnd: nextEnd }) =>
                          setGameLessonDrafts((prev) => ({
                            ...prev,
                            [game.key]: {
                              pageStart: nextStart,
                              pageEnd: nextEnd,
                            },
                          }))
                        }
                        onSave={() => void saveGameLesson(game)}
                        onRemove={() => void removeGameLesson(game)}
                      />
                    </div>
                    <div className="course-game-actions" role="cell">
                      <Link
                        className="admin-btn"
                        href={`/admin/courses/${courseId}/games/${game.key}`}
                      >
                        Sửa nội dung
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
