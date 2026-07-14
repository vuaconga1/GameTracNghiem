'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  nextEmptyIndex,
  normalizeStatuses,
} from '@/lib/gameCatalog';

import { gradeReadAndMatchExercise, gradeReadAndMatchPair } from './gradeAnswer';

type ReadAndMatchItem = {
  order: number;
  sentence: string;
  image: string;
  label: string;
  answer: string;
};

type ReadAndMatchExercise = {
  id: string;
  index: number;
  title: string;
  instruction: string;
  items: ReadAndMatchItem[];
};

type ReadAndMatchGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  exercises?: ReadAndMatchExercise[];
  unitTotal?: number;
  statuses?: ProgressStatus[];
  message?: string;
};

type MatchRecord = {
  label: string;
  correct: boolean;
  imageIndex: number;
};

type ShuffledImage = {
  itemIndex: number;
  item: ReadAndMatchItem;
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

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function exercisePreview(exercise: ReadAndMatchExercise): string {
  const sub = `${exercise.items.length} cặp · ${exercise.instruction || 'Read and match.'}`;
  return sub.length > 60 ? `${sub.slice(0, 60)}...` : sub;
}

export function ReadAndMatchGame({ courseId }: Props) {
  const [data, setData] = useState<ReadAndMatchGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSent, setSelectedSent] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, MatchRecord>>({});
  const [shuffledImages, setShuffledImages] = useState<ShuffledImage[]>([]);
  const [answered, setAnswered] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const questionStartTime = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizePending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/read-and-match/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as ReadAndMatchGameResponse;
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

  const matchedImageIndexes = useMemo(
    () => new Set(Object.values(matches).map((match) => match.imageIndex)),
    [matches]
  );

  const resetExerciseState = useCallback((exercise: ReadAndMatchExercise | undefined) => {
    setSelectedSent(null);
    setMatches({});
    setAnswered(false);
    setCheckResult(null);
    setSubmitMessage('');
    finalizePending.current = false;
    questionStartTime.current = Date.now();
    setShuffledImages(
      exercise
        ? shuffleArray(exercise.items.map((item, itemIndex) => ({ itemIndex, item })))
        : []
    );
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (panel === 'game' && currentExercise) {
      resetExerciseState(currentExercise);
    }
  }, [currentIndex, currentExercise, panel, resetExerciseState]);

  async function persistProgress(nextStatuses: ProgressStatus[], reset = false) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'read_and_match',
        statuses: nextStatuses,
        reset,
      }),
    });
    const json = (await res.json()) as {
      success: boolean;
      statuses?: ProgressStatus[];
      message?: string;
    };
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Không lưu được tiến độ');
    }
    if (json.statuses) {
      setStatuses(normalizeStatuses(json.statuses, exercises.length));
    }
  }

  function goNextExercise(nextStatuses = statuses) {
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
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      goNextExercise(nextStatuses);
    }, 900);
  }

  const finalizeExercise = useCallback(
    async (nextMatches: Record<number, MatchRecord>) => {
      if (!course || !currentExercise || isSubmitting || answered || finalizePending.current) {
        return;
      }

      if (Object.keys(nextMatches).length < currentExercise.items.length) {
        return;
      }

      finalizePending.current = true;
      setIsSubmitting(true);
      setSubmitMessage('');

      try {
        const { isCorrect, itemResults } = gradeReadAndMatchExercise(
          nextMatches,
          currentExercise.items
        );

        const nextStatuses = [...statuses];
        nextStatuses[currentExercise.index] = isCorrect ? 'correct' : 'wrong';
        setStatuses(nextStatuses);
        await persistProgress(nextStatuses);

        setAnswered(true);
        setCheckResult({
          isCorrect,
          correctCount: itemResults.filter(Boolean).length,
          itemResults,
          pointsEarned: 0,
        });
        scheduleAdvance(nextStatuses);
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : 'Không lưu được tiến độ');
        finalizePending.current = false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [answered, course, currentExercise, isSubmitting, statuses]
  );

  async function handleImageClick(entry: ShuffledImage, imageSlotIndex: number) {
    if (!course || !currentExercise || answered || isSubmitting) return;
    if (selectedSent === null || matches[selectedSent] || matchedImageIndexes.has(imageSlotIndex)) {
      return;
    }

    const sentenceIndex = selectedSent;
    const isCorrect = gradeReadAndMatchPair(entry.item.label, currentExercise.items[sentenceIndex].answer);
    const nextMatch: MatchRecord = {
      label: entry.item.label,
      correct: isCorrect,
      imageIndex: imageSlotIndex,
    };

    const nextMatches = { ...matches, [sentenceIndex]: nextMatch };
    setMatches(nextMatches);
    setSelectedSent(null);

    try {
      const elapsedMs = Date.now() - questionStartTime.current;
      const score = await submitAnswerScore(
        progressCourseKey(course.name, course.levelName),
        'read_and_match',
        currentExercise.index * 100 + sentenceIndex,
        isCorrect,
        elapsedMs
      );
      if (!score.success) {
        throw new Error(score.message || 'Không ghi được điểm');
      }
      if (typeof score.points === 'number' && score.points) {
        const points = score.points;
        setSessionPoints((current) => current + points);
      }
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không ghi được điểm');
      return;
    }

    void finalizeExercise(nextMatches);
  }

  function openExercise(index: number) {
    setCurrentIndex(index);
    setPanel('game');
  }

  function startOrContinue() {
    const firstEmptyIndex = nextEmptyIndex(statuses);
    if (firstEmptyIndex === -1) return;
    openExercise(firstEmptyIndex);
  }

  async function resetProgress(openFirstExercise: boolean) {
    if (!course || isResetting) return;

    const emptyStatuses = Array.from({ length: exercises.length }, () => 'empty' as ProgressStatus);

    setIsResetting(true);
    setSubmitMessage('');

    try {
      setStatuses(emptyStatuses);
      setSessionPoints(0);
      setCheckResult(null);
      setCurrentIndex(0);
      await persistProgress(emptyStatuses, true);
      setPanel(openFirstExercise ? 'game' : 'list');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không làm lại được bài');
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="game-page rm-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page rm-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="game-page rm-page">
        <DataLoading variant="message" message="Chưa có bài Đọc và nối cho khóa học này" />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page rm-page">
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
          <h1>Đọc và nối</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'list' ? (
        <div className="rm-banner">
          <h2>Đọc câu — nối với hình đúng</h2>
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
          <div className="rm-meta-row">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setPanel('list')}
            >
              <i className="fas fa-list" aria-hidden="true" /> Danh sách
            </button>
          </div>

          <div className="rm-worksheet">
            <span className="question-counter-pill">
              Bài {currentIndex + 1}/{exercises.length}
            </span>
            <h2 className="rm-ws-title">{currentExercise.title}</h2>
            <p className="rm-ws-instruction">{currentExercise.instruction}</p>
            <p className="rm-touch-hint">
              <i className="fas fa-hand-pointer" aria-hidden="true" /> Chọn câu bên trái, rồi chọn
              hình tương ứng bên phải
            </p>

            <div className="rm-board">
              <div className="rm-col">
                <h3>
                  <i className="fas fa-file-alt" aria-hidden="true" /> Câu
                </h3>
                {currentExercise.items.map((item, sentenceIndex) => {
                  const match = matches[sentenceIndex];
                  const isMatched = Boolean(match);
                  const sentenceClass = [
                    'rm-sentence',
                    selectedSent === sentenceIndex ? 'is-selected' : '',
                    isMatched ? 'is-matched' : '',
                    isMatched && match.correct ? 'is-correct' : '',
                    isMatched && !match.correct ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div
                      key={`sent-${currentExercise.id}-${sentenceIndex}`}
                      className={sentenceClass}
                      onClick={() => {
                        if (answered || isMatched) return;
                        setSelectedSent(sentenceIndex);
                      }}
                    >
                      {sentenceIndex + 1}. {item.sentence}
                    </div>
                  );
                })}
              </div>

              <div className="rm-col">
                <h3>
                  <i className="fas fa-image" aria-hidden="true" /> Hình
                </h3>
                {shuffledImages.map((entry, imageSlotIndex) => {
                  const sentenceIndexKey = Object.keys(matches).find(
                    (key) => matches[Number(key)].imageIndex === imageSlotIndex
                  );
                  const match = sentenceIndexKey !== undefined ? matches[Number(sentenceIndexKey)] : null;
                  const isMatched = Boolean(match);
                  const cardClass = [
                    'rm-image-card',
                    isMatched ? 'is-matched' : '',
                    isMatched && match?.correct ? 'is-correct' : '',
                    isMatched && match && !match.correct ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const isPlaceholderImage = entry.item.image
                    ? entry.item.image.includes('placehold.co')
                    : true;

                  return (
                    <div
                      key={`img-${currentExercise.id}-${entry.itemIndex}-${imageSlotIndex}`}
                      className={cardClass}
                      onClick={() => void handleImageClick(entry, imageSlotIndex)}
                    >
                      <span className="rm-label">{entry.item.label}</span>
                      {entry.item.image && !isPlaceholderImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.item.image} alt={entry.item.label} loading="lazy" />
                      ) : (
                        <div className="rm-text-badge-wrapper" aria-label={entry.item.label}>
                          {entry.item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                ? 'Tuyệt vời! Nối đúng tất cả!'
                : `Đúng ${checkResult.correctCount}/${currentExercise.items.length} cặp.`}
            </div>
          ) : null}

          <div className="game-actions">
            {answered ? (
              <button type="button" className="btn btn-secondary" onClick={() => goNextExercise()}>
                {currentIndex + 1 >= exercises.length ? 'Xem kết quả' : 'Bài tiếp theo'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => resetExerciseState(currentExercise)}
              >
                Làm lại bài này
              </button>
            )}
          </div>
        </div>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <div className="result-panel">
            <h2>Hoàn thành!</h2>
            <p>
              Bạn đã hoàn thành {exercises.length} bài — đúng {stats.correct}, sai {stats.wrong}.
              {sessionPoints ? ` Tổng điểm phiên: ${formatPoints(sessionPoints)}.` : ''}
            </p>
            <div className="game-actions">
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
