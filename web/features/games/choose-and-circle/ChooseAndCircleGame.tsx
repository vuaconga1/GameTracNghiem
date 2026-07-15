'use client';

import Link from 'next/link';
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DataLoading } from '@/components/DataLoading';
import { GameResultSummary, GameScoreHero } from '@/components/games/GameScoreHero';
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

import { gradeChooseAndCircleExercise, normalizeWord } from './gradeAnswer';

type ChooseAndCircleItem = {
  order: number;
  image: string;
  options: string[];
  answer: string;
};

type ChooseAndCircleExercise = {
  id: string;
  index: number;
  title: string;
  instruction: string;
  items: ChooseAndCircleItem[];
};

type ChooseAndCircleGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  exercises?: ChooseAndCircleExercise[];
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

function exercisePreview(exercise: ChooseAndCircleExercise): string {
  const sub = `${exercise.items.length} tranh · ${exercise.instruction || 'Choose and circle.'}`;
  return sub.length > 60 ? `${sub.slice(0, 60)}...` : sub;
}

function CircleSvg() {
  return (
    <svg className="cc-circle-svg" viewBox="0 0 100 72" aria-hidden="true">
      <ellipse
        className="cc-circle-path"
        cx="50"
        cy="36"
        rx="46"
        ry="30"
        pathLength="300"
      />
    </svg>
  );
}

export function ChooseAndCircleGame({ courseId }: Props) {
  const [data, setData] = useState<ChooseAndCircleGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [circledKeys, setCircledKeys] = useState<Record<number, string>>({});
  const [answered, setAnswered] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [playSessionId, setPlaySessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const questionStartTime = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCheckPending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/choose-and-circle/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as ChooseAndCircleGameResponse;
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
  const unitTotal =
    data?.unitTotal ?? exercises.reduce((total, exercise) => total + exercise.items.length, 0);
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
    setCircledKeys({});
    setAnswered(false);
    setCheckResult(null);
    setSubmitMessage('');
    autoCheckPending.current = false;
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
        const nextPicks: Record<number, string> = {};
        currentExercise.items.forEach((item, index) => {
          nextPicks[index] = item.answer;
        });
        setPicks(nextPicks);
        setCircledKeys({});
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
      game: 'choose_and_circle',
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

  const handleCheck = useCallback(async () => {
    if (!course || !currentExercise || isSubmitting || answered) return;

    const allPicked = currentExercise.items.every((_, index) => Boolean(picks[index]));
    if (!allPicked) {
      setSubmitMessage('Hãy khoanh đáp án cho tất cả các tranh.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const { isCorrect, itemResults } = gradeChooseAndCircleExercise(
        picks,
        currentExercise.items
      );
      const elapsedMs = Date.now() - questionStartTime.current;
      const sessionId = await ensurePlaySession();
      let pointsEarned = 0;

      for (let itemIndex = 0; itemIndex < currentExercise.items.length; itemIndex += 1) {
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'choose_and_circle',
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
      autoCheckPending.current = false;
    }
  }, [
    answered,
    course,
    currentExercise,
    isSubmitting,
    picks,
    statuses,
  ]);

  useEffect(() => {
    if (!currentExercise || answered || isSubmitting || autoCheckPending.current) return;
    const allPicked = currentExercise.items.every((_, index) => Boolean(picks[index]));
    if (!allPicked) return;
    autoCheckPending.current = true;
    void handleCheck();
  }, [answered, currentExercise, handleCheck, isSubmitting, picks]);

  function selectOption(itemIndex: number, word: string) {
    if (answered) return;
    setPicks((current) => ({ ...current, [itemIndex]: word }));
    setCircledKeys((current) => ({ ...current, [itemIndex]: `${itemIndex}-${word}-${Date.now()}` }));
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

  function optionClass(
    itemIndex: number,
    word: string,
    item: ChooseAndCircleItem,
    itemCorrect: boolean | undefined
  ): string {
    const classes = ['cc-opt-wrap'];
    const circledKey = circledKeys[itemIndex];
    if (circledKey?.startsWith(`${itemIndex}-${word}-`)) {
      classes.push('is-circled');
    }
    if (answered) {
      if (normalizeWord(word) === normalizeWord(item.answer)) {
        classes.push('is-correct');
      } else if (
        normalizeWord(word) === normalizeWord(picks[itemIndex] || '') &&
        itemCorrect === false
      ) {
        classes.push('is-wrong');
      }
    }
    return classes.join(' ');
  }

  if (isLoading) {
    return (
      <div className="game-page cc-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page cc-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="game-page cc-page">
        <DataLoading variant="message" message="Chưa có bài Chọn và khoanh cho khóa học này" />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page cc-page">
      <div className="game-top">
        <button
          type="button"
          className="game-back"
          title={panel === 'game' ? 'Về danh sách' : 'Quay lại khóa học'}
          aria-label={panel === 'game' ? 'Về danh sách' : 'Quay lại khóa học'}
          onClick={() => {
            if (panel === 'game') {
              setPanel('list');
            } else {
              window.location.href = `/courses/${course.id}`;
            }
          }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </button>
        <div className="game-title-wrap">
          <h1>Chọn và khoanh</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'list' ? (
        <div className="cc-banner">
          <h2>Nhìn tranh — khoanh từ đúng</h2>
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
          <GameScoreHero gameScore={gameScore} />
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
          <div className="cc-meta-row">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setPanel('list')}
            >
              <i className="fas fa-list" aria-hidden="true" /> Danh sách
            </button>
          </div>

          <div className="cc-worksheet" id="worksheet">
            <span className="question-counter-pill" id="metaProgress">
              Bài {currentIndex + 1}/{exercises.length}
            </span>
            <span className="cc-deco cc-deco-cloud" aria-hidden="true">
              ☁
            </span>
            <span className="cc-deco cc-deco-cloud-2" aria-hidden="true">
              ☁
            </span>
            <span className="cc-deco cc-deco-flower" aria-hidden="true">
              🌸
            </span>
            <span className="cc-deco cc-deco-flower-2" aria-hidden="true">
              🌼
            </span>

            <div className="cc-star-badge" id="wsBadge">
              {currentIndex + 1}
            </div>
            <h2 className="cc-ws-title" id="wsTitle">
              {currentExercise.title}
            </h2>
            <p className="cc-ws-instruction" id="wsInstruction">
              {currentExercise.instruction}
            </p>

            <div className="cc-rows" id="itemGrid">
              {currentExercise.items.map((item, itemIndex) => (
                <div key={`${currentExercise.id}-${itemIndex}`} className="cc-row" data-index={itemIndex}>
                  <span className="cc-row-num">{item.order || itemIndex + 1}</span>
                  <div className="cc-picture">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={`Picture ${item.order || itemIndex + 1}`}
                        loading="lazy"
                        onError={(event: SyntheticEvent<HTMLImageElement>) => {
                          event.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    ) : (
                      <i className="fas fa-image" style={{ fontSize: 40, color: '#ccc' }} aria-hidden="true" />
                    )}
                  </div>
                  <div className="cc-options">
                    {item.options.map((word) => (
                      <button
                        key={`${itemIndex}-${word}`}
                        type="button"
                        className={optionClass(
                          itemIndex,
                          word,
                          item,
                          checkResult?.itemResults[itemIndex]
                        )}
                        disabled={answered}
                        onClick={() => selectOption(itemIndex, word)}
                      >
                        <span className="cc-opt-text">{word}</span>
                        <CircleSvg />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
                ? 'Tuyệt vời! Đúng tất cả!'
                : `Đúng ${checkResult.correctCount}/${currentExercise.items.length} câu.`}
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
            gameScore={gameScore}
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
