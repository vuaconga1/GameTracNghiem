'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { PageBackButton } from '@/components/PageBackButton';
import { GameResultSummary } from '@/components/games/GameScoreHero';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { clearAutoAdvance, scheduleAutoAdvance } from '@/features/games/autoAdvance';
import {
  createPlaySessionId,
  persistGameProgress,
} from '@/features/games/persistProgress';
import { gradedIsCorrect, isGradedStatus } from '@/features/games/gradedLock';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  nextEmptyIndex,
  normalizeStatuses,
} from '@/lib/gameCatalog';

import { gradeVocabularyCheckExercise } from './gradeAnswer';

type VocabularyCheckItem = {
  order: number;
  image: string;
  word: string;
  sentence: string;
  is_correct: boolean;
};

type VocabularyCheckExercise = {
  id: string;
  index: number;
  title: string;
  instruction: string;
  items: VocabularyCheckItem[];
};

type VocabularyCheckGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  exercises?: VocabularyCheckExercise[];
  unitTotal?: number;
  statuses?: ProgressStatus[];
  gameScore?: number;
  playSessionId?: string | null;
  message?: string;
};

type CheckResult = {
  isCorrect: boolean;
  correctCount: number;
  itemResults: boolean[];
  pointsEarned: number;
};

type Props = {
  courseId: string;
};

type Panel = 'list' | 'game' | 'result';

type ExerciseStats = {
  total: number;
  correct: number;
  wrong: number;
  pending: number;
};

function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toLocaleString('vi-VN')} điểm`;
}

function statusClass(status: ProgressStatus): string {
  if (status === 'correct') return 'status-correct';
  if (status === 'wrong') return 'status-wrong';
  return 'status-pending';
}

function statusIcon(status: ProgressStatus) {
  if (status === 'correct') {
    return <i className="fas fa-check" aria-hidden="true" />;
  }
  if (status === 'wrong') {
    return <i className="fas fa-times" aria-hidden="true" />;
  }
  return <i className="far fa-circle" aria-hidden="true" />;
}

function exercisePreview(exercise: VocabularyCheckExercise): string {
  const sub = `${exercise.items.length} dòng · ${exercise.instruction || 'Vocabulary check.'}`;
  return sub.length > 60 ? `${sub.slice(0, 60)}...` : sub;
}

export function VocabularyCheckGame({ courseId }: Props) {
  const [data, setData] = useState<VocabularyCheckGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picks, setPicks] = useState<Record<number, boolean>>({});
  const [answered, setAnswered] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [, setGameScore] = useState(0);
  const [playSessionId, setPlaySessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const questionStartTime = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/vocabulary-check/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as VocabularyCheckGameResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không tải được trò chơi');
        }

        const exercises = json.exercises || [];
        const nextStatuses = normalizeStatuses(json.statuses, exercises.length);
        const firstEmptyIndex = nextEmptyIndex(nextStatuses);

        setData(json);
        setStatuses(nextStatuses);
        setCurrentIndex(firstEmptyIndex === -1 ? 0 : firstEmptyIndex);
        setPanel('list');
        setSessionPoints(0);
        setGameScore(json.gameScore || 0);
        setPlaySessionId(json.playSessionId || null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setData(null);
        setErrorMessage(err instanceof Error ? err.message : 'Không tải được trò chơi');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (courseId) {
      loadGame();
    }

    return () => {
      controller.abort();
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [courseId]);

  const exercises = useMemo(() => data?.exercises || [], [data?.exercises]);
  const course = data?.course;
  const currentExercise = exercises[currentIndex];
  const unitTotal = data?.unitTotal ?? exercises.reduce((total, exercise) => total + exercise.items.length, 0);
  const maxScore = unitTotal * 200;

  const stats = useMemo<ExerciseStats>(() => {
    const correct = statuses.filter((status) => status === 'correct').length;
    const wrong = statuses.filter((status) => status === 'wrong').length;
    return {
      total: exercises.length,
      correct,
      wrong,
      pending: Math.max(exercises.length - correct - wrong, 0),
    };
  }, [exercises.length, statuses]);

  const progressPercent = maxScore ? Math.min(100, Math.round((sessionPoints / maxScore) * 100)) : 0;

  const resetExerciseState = useCallback(() => {
    setPicks({});
    setAnswered(false);
    setCheckResult(null);
    setSubmitMessage('');
    questionStartTime.current = Date.now();
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (panel === 'game' && currentExercise) {
      if (isGradedStatus(statuses[currentIndex])) {
        clearAutoAdvance(advanceTimer);
        const nextPicks: Record<number, boolean> = {};
        currentExercise.items.forEach((item, index) => {
          nextPicks[index] = item.is_correct;
        });
        setPicks(nextPicks);
        setAnswered(true);
        setCheckResult({
          isCorrect: gradedIsCorrect(statuses[currentIndex]),
          correctCount: gradedIsCorrect(statuses[currentIndex])
            ? currentExercise.items.length
            : 0,
          itemResults: currentExercise.items.map(() => gradedIsCorrect(statuses[currentIndex])),
          pointsEarned: 0,
        });
        setSubmitMessage('');
      } else {
        resetExerciseState();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply lock when entering exercise
  }, [currentIndex, currentExercise, panel, resetExerciseState]);

  async function persistProgress(
    nextStatuses: ProgressStatus[],
    reset = false,
    sessionId?: string | null
  ) {
    if (!course) return null;

    const json = await persistGameProgress({
      courseKey: progressCourseKey(course.name, course.levelName),
      game: 'vocabulary_check',
      statuses: nextStatuses,
      reset,
      playSessionId: sessionId === undefined ? playSessionId : sessionId,
    });
    if (!json.success) {
      throw new Error(json.message || 'Không lưu được tiến độ');
    }
    if (json.statuses) {
      setStatuses(normalizeStatuses(json.statuses, exercises.length));
    }
    if (json.playSessionId) {
      setPlaySessionId(json.playSessionId);
    }
    return json.playSessionId || sessionId || playSessionId;
  }

  async function ensurePlaySession(): Promise<string> {
    if (playSessionId) return playSessionId;
    const nextId = createPlaySessionId();
    const saved = await persistProgress(statuses, false, nextId);
    return saved || nextId;
  }

  function setPick(itemIndex: number, value: boolean) {
    if (answered) return;
    setPicks((current) => ({ ...current, [itemIndex]: value }));
  }

  function goNextExercise(nextStatuses = statuses) {
    clearAutoAdvance(advanceTimer);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= exercises.length) {
      const pending = nextStatuses.filter((status) => status === 'empty').length;
      if (pending === 0) {
        setPanel('result');
      } else {
        setPanel('list');
      }
      return;
    }
    setCurrentIndex(nextIndex);
  }

  function scheduleAdvance(nextStatuses: ProgressStatus[]) {
    scheduleAutoAdvance(advanceTimer, () => goNextExercise(nextStatuses));
  }

  async function handleCheck() {
    if (!course || !currentExercise || isSubmitting || answered) return;

    const allPicked = currentExercise.items.every((_, index) => picks[index] !== undefined);
    if (!allPicked) {
      setSubmitMessage('Hãy chọn ✓ hoặc ✗ cho tất cả các dòng.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const { isCorrect, itemResults } = gradeVocabularyCheckExercise(picks, currentExercise.items);
      const elapsedMs = Date.now() - questionStartTime.current;
      const sessionId = await ensurePlaySession();
      let pointsEarned = 0;

      for (let itemIndex = 0; itemIndex < currentExercise.items.length; itemIndex += 1) {
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'vocabulary_check',
          currentExercise.index * 100 + itemIndex,
          itemResults[itemIndex],
          elapsedMs,
          sessionId
        );
        if (!score.success) {
          throw new Error(score.message || 'Không ghi được điểm');
        }
        if (typeof score.points === 'number') {
          pointsEarned += score.points;
        }
        if (typeof score.gameScore === 'number') {
          setGameScore(score.gameScore);
        }
      }

      if (pointsEarned) {
        setSessionPoints((current) => current + pointsEarned);
      }

      const nextStatuses = [...statuses];
      nextStatuses[currentExercise.index] = isCorrect ? 'correct' : 'wrong';
      setStatuses(nextStatuses);
      await persistProgress(nextStatuses);

      setAnswered(true);
      setCheckResult({
        isCorrect,
        correctCount: itemResults.filter(Boolean).length,
        itemResults,
        pointsEarned,
      });
      scheduleAdvance(nextStatuses);
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không nộp được câu trả lời');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openExercise(index: number) {
    void (async () => {
      try {
        await ensurePlaySession();
        setCurrentIndex(index);
        setPanel('game');
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : 'Không mở được bài');
      }
    })();
  }

  function startOrContinue() {
    const firstEmptyIndex = nextEmptyIndex(statuses);
    if (firstEmptyIndex === -1) return;
    openExercise(firstEmptyIndex);
  }

  async function resetProgress(openFirstExercise: boolean) {
    if (!course || isResetting) return;

    const emptyStatuses = Array.from({ length: exercises.length }, () => 'empty' as ProgressStatus);
    const nextSession = createPlaySessionId();

    setIsResetting(true);
    setSubmitMessage('');

    try {
      setStatuses(emptyStatuses);
      setSessionPoints(0);
      setCheckResult(null);
      setCurrentIndex(0);
      setPlaySessionId(nextSession);
      await persistProgress(emptyStatuses, true, nextSession);
      setPanel(openFirstExercise ? 'game' : 'list');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không làm lại được bài');
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="game-page vc-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page vc-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="game-page vc-page">
        <DataLoading variant="message" message="Chưa có bài Kiểm tra đúng sai cho khóa học này" />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page vc-page">
      <PageBackButton
        title={panel === 'game' ? 'Về danh sách' : 'Quay lại khóa học'}
        onClick={() => {
          if (panel === 'game') {
            setPanel('list');
          } else {
            window.location.href = `/courses/${course.id}`;
          }
        }}
      />
      <div className="game-top">
        <div className="game-title-wrap">
          <h1>Kiểm tra đúng sai</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'list' ? (
        <div className="vc-banner">
          <h2>Kiểm tra đúng sai — chọn ✓ hoặc ✗ cho mỗi câu</h2>
          <p>{course.name}</p>
        </div>
      ) : null}

      {panel === 'game' && currentExercise ? (
        <div className="game-meta">
          <span className="meta-pill">{course.name || 'Khóa học'}</span>
          <span className="meta-pill meta-score-pill">
            {sessionPoints.toLocaleString('vi-VN')}/{maxScore.toLocaleString('vi-VN')} điểm
          </span>
          <div
            className="progress-bar-wrap"
            aria-label={`Điểm phiên ${sessionPoints}/${maxScore}`}
          >
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : null}

      {panel === 'list' ? (
        <div className="game-card" id="listPanel">
          <div className="list-title">Danh sách bài tập</div>
          <div className="list-stats">
            <div className="stat-item">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">Tổng bài</span>
            </div>
            <div className="stat-item correct">
              <span className="stat-num">{stats.correct}</span>
              <span className="stat-label">Đúng</span>
            </div>
            <div className="stat-item wrong">
              <span className="stat-num">{stats.wrong}</span>
              <span className="stat-label">Sai</span>
            </div>
            <div className="stat-item pending">
              <span className="stat-num">{stats.pending}</span>
              <span className="stat-label">Chưa làm</span>
            </div>
          </div>
          <div className="question-list">
            {exercises.map((exercise, index) => {
              const status = statuses[index] || 'empty';
              return (
                <div
                  key={exercise.id}
                  role="button"
                  tabIndex={0}
                  className={`q-list-item ${statusClass(status)}`}
                  onClick={() => openExercise(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openExercise(index);
                    }
                  }}
                >
                  <span className="q-num">{index + 1}</span>
                  <span className="q-preview">
                    <strong>{exercise.title}</strong>
                    <br />
                    <small style={{ color: '#9e9e9e', fontWeight: 600 }}>
                      {exercisePreview(exercise)}
                    </small>
                  </span>
                  <span className="q-status">{statusIcon(status)}</span>
                </div>
              );
            })}
          </div>
          <div className="game-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={allAnswered ? () => void resetProgress(true) : startOrContinue}
              disabled={isResetting}
            >
              {isResetting ? 'Đang làm lại...' : startLabel}
            </button>
            {allAnswered ? (
              <button type="button" className="btn btn-secondary" onClick={() => setPanel('result')}>
                Xem kết quả
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {panel === 'game' && currentExercise ? (
        <div className="game-card" id="gamePanel">
          <div className="vc-meta-row">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setPanel('list')}
            >
              <i className="fas fa-list" aria-hidden="true" /> Danh sách
            </button>
          </div>

          <div className="vc-worksheet">
            <span className="question-counter-pill">
              Bài {currentIndex + 1}/{exercises.length}
            </span>
            <h2 className="vc-title">{currentExercise.title}</h2>
            <p className="vc-instruction">{currentExercise.instruction}</p>

            <div className="vc-list">
              {currentExercise.items.map((item, itemIndex) => {
                const pick = picks[itemIndex];
                const itemCorrect = checkResult?.itemResults[itemIndex];
                const rowClass = [
                  'vc-row',
                  answered && itemCorrect === true ? 'is-correct' : '',
                  answered && itemCorrect === false ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div key={`${currentExercise.id}-${itemIndex}`} className={rowClass}>
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.word || `Picture ${itemIndex + 1}`} loading="lazy" />
                    ) : (
                      <div className="vc-img-placeholder">
                        <i className="fas fa-image" aria-hidden="true" />
                      </div>
                    )}
                    <div className="vc-word">{item.word}</div>
                    <div className="vc-sentence">{item.sentence}</div>
                    <div className="vc-actions">
                      <button
                        type="button"
                        className={`vc-btn${pick === true ? ' is-selected-ok' : ''}`}
                        aria-label="Đúng"
                        disabled={answered}
                        onClick={() => setPick(itemIndex, true)}
                      >
                        <i className="fas fa-check" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`vc-btn${pick === false ? ' is-selected-bad' : ''}`}
                        aria-label="Sai"
                        disabled={answered}
                        onClick={() => setPick(itemIndex, false)}
                      >
                        <i className="fas fa-times" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {submitMessage ? <div className="feedback show wrong">{submitMessage}</div> : null}

          {checkResult ? (
            <div className={`feedback show ${checkResult.isCorrect ? 'correct' : 'wrong'}`}>
              <i
                className={checkResult.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'}
                aria-hidden="true"
              />{' '}
              {checkResult.isCorrect
                ? `Tuyệt vời! Bạn đã đúng tất cả ${currentExercise.items.length} dòng!`
                : `Bạn đúng ${checkResult.correctCount}/${currentExercise.items.length} dòng. Thử lại nhé!`}
              {checkResult.pointsEarned ? (
                <div className="score-line">{formatPoints(checkResult.pointsEarned)}</div>
              ) : null}
            </div>
          ) : null}

          <div className="game-actions">
            {!answered ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleCheck()}
                disabled={isSubmitting}
              >
                <i className="fas fa-check" aria-hidden="true" />{' '}
                {isSubmitting ? 'Đang kiểm tra...' : 'Kiểm tra đáp án'}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => goNextExercise()}>
                {currentIndex + 1 >= exercises.length ? 'Xem kết quả' : 'Bài tiếp theo'}
              </button>
            )}
            {!answered ? (
              <button type="button" className="btn btn-secondary" onClick={resetExerciseState}>
                Làm lại bài này
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <GameResultSummary
            correct={stats.correct}
            total={stats.total}
            wrong={stats.wrong}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void resetProgress(false)}
              disabled={isResetting}
            >
              {isResetting ? 'Đang làm lại...' : 'Làm lại'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPanel('list')}>
              Quay lại danh sách
            </button>
            <Link href={`/courses/${course.id}`} className="btn btn-secondary">
              Quay lại khóa học
            </Link>
          </GameResultSummary>
        </div>
      ) : null}
    </div>
  );
}
