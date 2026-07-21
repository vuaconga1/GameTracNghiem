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
import { ALL_GAME_KEYS, resolveEnabledGameKeys } from '@/lib/gameCatalog';

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

type Course = {
  id: string;
  name: string;
  levelName: string;
  active: boolean;
  enabledGames?: string[];
  ebookFileId?: string | null;
  ebookPageStart?: number | null;
  ebookPageEnd?: number | null;
  gameLessons?: CourseGameLesson[];
};

type EbookOption = {
  id: string;
  title: string;
  pageCount: number | null;
  active: boolean;
};

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
  const [enabled, setEnabled] = useState<Set<string>>(new Set(ALL_GAME_KEYS));
  const [ebookId, setEbookId] = useState('');
  const [pageStart, setPageStart] = useState('');
  const [pageEnd, setPageEnd] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingGameLessonKeys, setSavingGameLessonKeys] = useState<Set<string>>(new Set());
  const [savingLesson, setSavingLesson] = useState(false);
  const [gameLessonDrafts, setGameLessonDrafts] = useState<
    Record<string, Omit<CourseGameLessonEditorValue, 'saved'>>
  >({});

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
    setEnabled(new Set(resolveEnabledGameKeys(nextCourse.enabledGames)));
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
    if (ebooksData.success) {
      setEbooks(
        (ebooksData.items as EbookOption[]).filter((item) => item.active !== false)
      );
    }
    setError('');
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleCount = useMemo(
    () => games.filter((game) => enabled.has(game.key)).length,
    [games, enabled]
  );

  async function toggleGame(gameKey: string, nextVisible: boolean) {
    if (!course || savingKey) return;

    const next = new Set(enabled);
    if (nextVisible) next.add(gameKey);
    else next.delete(gameKey);

    const enabledGames = ALL_GAME_KEYS.filter((key) => next.has(key));
    setEnabled(next);
    setSavingKey(gameKey);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledGames }),
      });
      const data = await res.json();
      if (!data.success) {
        setEnabled(enabled);
        setError(data.message || 'Không lưu được trạng thái game');
        return;
      }
      setCourse((prev) =>
        prev ? { ...prev, enabledGames: data.item.enabledGames as string[] } : prev
      );
      setMessage(
        nextVisible
          ? `Đã hiện “${games.find((g) => g.key === gameKey)?.label || gameKey}” với học sinh`
          : `Đã ẩn “${games.find((g) => g.key === gameKey)?.label || gameKey}” với học sinh`
      );
    } catch {
      setEnabled(enabled);
      setError('Lỗi mạng khi lưu trạng thái game');
    } finally {
      setSavingKey(null);
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
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Bài học (PDF)</h3>
            <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              Chọn sách và khoảng trang trong PDF. Học sinh chỉ lật trong khoảng này.
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

          <div className="admin-panel course-game-panel">
            <div className="course-game-panel-head">
              <h3>Danh sách game</h3>
            </div>

            <div className="course-game-list" role="table" aria-label="Danh sách game của khóa">
              <div className="course-game-list-head" role="row">
                <span role="columnheader">Game</span>
                <span role="columnheader">Số câu / bài</span>
                <span role="columnheader">Hiện với HS</span>
                <span role="columnheader">Bài học PDF</span>
                <span role="columnheader">Thao tác</span>
              </div>

              {games.map((game) => {
                const isOn = enabled.has(game.key);
                const busy = savingKey === game.key;
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
                      <label className="course-game-switch">
                        <input
                          type="checkbox"
                          checked={isOn}
                          disabled={busy}
                          onChange={(e) => void toggleGame(game.key, e.target.checked)}
                          aria-label={`${isOn ? 'Ẩn' : 'Hiện'} ${game.label} với học sinh`}
                        />
                        <span className="course-game-switch-ui" aria-hidden="true" />
                        <span className="course-game-switch-text">
                          {busy ? '…' : isOn ? 'Hiện' : 'Ẩn'}
                        </span>
                      </label>
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
