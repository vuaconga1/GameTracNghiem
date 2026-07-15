'use client';

import Link from 'next/link';
import {
  type DragEvent,
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

import { gradeVocabularyTestExercise } from './gradeAnswer';

type VocabularyTestItem = {
  order: number;
  image: string;
  answer: string;
};

type VocabularyTestExercise = {
  id: string;
  index: number;
  title: string;
  instruction: string;
  word_bank: string[];
  items: VocabularyTestItem[];
};

type VocabularyTestGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  exercises?: VocabularyTestExercise[];
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

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function exercisePreview(exercise: VocabularyTestExercise): string {
  const sub = `${exercise.items.length} tranh · ${exercise.instruction || 'Vocabulary test.'}`;
  return sub.length > 60 ? `${sub.slice(0, 60)}...` : sub;
}

export function VocabularyTestGame({ courseId }: Props) {
  const [data, setData] = useState<VocabularyTestGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [bankOrder, setBankOrder] = useState<string[]>([]);
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
  const [bankDragOver, setBankDragOver] = useState(false);
  const [zoneDragOver, setZoneDragOver] = useState<number | null>(null);
  const questionStartTime = useRef(Date.now());
  const dragWord = useRef<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/vocabulary-test/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as VocabularyTestGameResponse;
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

  const usedWords = useMemo(
    () => Object.values(placements).filter(Boolean),
    [placements]
  );

  const availableWords = useMemo(
    () => bankOrder.filter((word) => !usedWords.includes(word)),
    [bankOrder, usedWords]
  );

  const resetExerciseState = useCallback((exercise: VocabularyTestExercise | undefined) => {
    setPlacements({});
    setSelectedWord(null);
    setAnswered(false);
    setCheckResult(null);
    setSubmitMessage('');
    setBankDragOver(false);
    setZoneDragOver(null);
    dragWord.current = null;
    setBankOrder(exercise ? shuffleArray(exercise.word_bank) : []);
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
        const filled: Record<number, string> = {};
        currentExercise.items.forEach((item, index) => {
          filled[index] = item.answer;
        });
        setPlacements(filled);
        setSelectedWord(null);
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
        setBankOrder(shuffleArray(currentExercise.word_bank));
      } else {
        resetExerciseState(currentExercise);
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
      game: 'vocabulary_test',
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

  function placeWord(itemIndex: number, word: string) {
    if (answered || !word) return;

    setPlacements((current) => {
      const next: Record<number, string> = { ...current };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === word) {
          delete next[Number(key)];
        }
      }
      next[itemIndex] = word;
      return next;
    });
    setSelectedWord(null);
  }

  function removeWordFromZone(itemIndex: number) {
    if (answered) return;
    setPlacements((current) => {
      if (!current[itemIndex]) return current;
      const next = { ...current };
      delete next[itemIndex];
      return next;
    });
  }

  function returnWordToBank(word: string) {
    if (answered || !word) return;
    setPlacements((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === word) {
          delete next[Number(key)];
        }
      }
      return next;
    });
  }

  function toggleWordSelection(word: string) {
    if (answered) return;
    setSelectedWord((current) => (current === word ? null : word));
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

    const allFilled = currentExercise.items.every((_, index) => Boolean(placements[index]));
    if (!allFilled) {
      setSubmitMessage('Hãy kéo từ vào tất cả các ô trống trước khi kiểm tra.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const { isCorrect, itemResults } = gradeVocabularyTestExercise(
        placements,
        currentExercise.items
      );
      const elapsedMs = Date.now() - questionStartTime.current;
      const sessionId = await ensurePlaySession();
      let pointsEarned = 0;

      for (let itemIndex = 0; itemIndex < currentExercise.items.length; itemIndex += 1) {
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'vocabulary_test',
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

  function handleChipDragStart(event: DragEvent<HTMLSpanElement>, word: string) {
    if (answered) {
      event.preventDefault();
      return;
    }
    dragWord.current = word;
    event.dataTransfer.setData('text/plain', word);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleChipDragEnd() {
    dragWord.current = null;
    setBankDragOver(false);
    setZoneDragOver(null);
  }

  function resolveDroppedWord(event: DragEvent): string {
    return event.dataTransfer.getData('text/plain') || dragWord.current || '';
  }

  if (isLoading) {
    return (
      <div className="game-page vt-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page vt-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="game-page vt-page">
        <DataLoading variant="message" message="Chưa có bài Kiểm tra từ vựng cho khóa học này" />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page vt-page">
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
          <h1>Kiểm tra từ vựng</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'list' ? (
        <div className="law-banner">
          <h2>Kiểm tra từ vựng — kéo từ vào đúng chỗ</h2>
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
          <div className="law-meta-row">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setPanel('list')}
            >
              <i className="fas fa-list" aria-hidden="true" /> Danh sách
            </button>
          </div>

          <div className="law-worksheet" id="worksheet">
            <span className="question-counter-pill" id="metaProgress">
              Bài {currentIndex + 1}/{exercises.length}
            </span>
            <h2 className="law-title">{currentExercise.title}</h2>
            <p className="law-instruction">{currentExercise.instruction}</p>

            <div
              className={`law-word-bank${bankDragOver ? ' is-drag-over' : ''}`}
              id="wordBank"
              onDragOver={(event) => {
                if (answered) return;
                event.preventDefault();
                setBankDragOver(true);
              }}
              onDragLeave={() => setBankDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setBankDragOver(false);
                const word = resolveDroppedWord(event);
                returnWordToBank(word);
              }}
            >
              <span className="law-word-bank-label">Kéo từ từ đây</span>
              {availableWords.map((word) => (
                <span
                  key={word}
                  className={`law-chip${selectedWord === word ? ' is-selected' : ''}`}
                  draggable={!answered}
                  data-word={word}
                  onDragStart={(event) => handleChipDragStart(event, word)}
                  onDragEnd={handleChipDragEnd}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleWordSelection(word);
                  }}
                >
                  {word}
                </span>
              ))}
            </div>

            <p className="law-touch-hint" id="touchHint">
              <i className="fas fa-hand-pointer" aria-hidden="true" /> Chạm chọn từ, rồi chạm vào ô
              trống bên dưới tranh
            </p>

            <div className="law-grid" id="pictureGrid">
              {currentExercise.items.map((item, itemIndex) => {
                const placed = placements[itemIndex];
                const itemCorrect = checkResult?.itemResults[itemIndex];
                const zoneClass = [
                  'law-drop-zone',
                  zoneDragOver === itemIndex ? 'is-drag-over' : '',
                  answered && itemCorrect === true ? 'is-correct' : '',
                  answered && itemCorrect === false ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div key={`${currentExercise.id}-${itemIndex}`} className="law-item">
                    <span className="law-item-num">{item.order || itemIndex + 1}.</span>
                    <div className="law-item-img-wrap">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="law-item-img"
                          src={item.image}
                          alt={`Picture ${item.order || itemIndex + 1}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <i className="fas fa-image" style={{ fontSize: 40, color: '#ccc' }} aria-hidden="true" />
                      )}
                    </div>
                    <div
                      className={zoneClass}
                      id={`drop-zone-${itemIndex}`}
                      data-index={itemIndex}
                      onDragOver={(event) => {
                        if (answered) return;
                        event.preventDefault();
                        setZoneDragOver(itemIndex);
                      }}
                      onDragLeave={() => setZoneDragOver(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setZoneDragOver(null);
                        const word = resolveDroppedWord(event);
                        placeWord(itemIndex, word);
                      }}
                      onClick={() => {
                        if (selectedWord) {
                          placeWord(itemIndex, selectedWord);
                        }
                      }}
                    >
                      {placed ? (
                        <span
                          className="law-chip"
                          draggable={!answered}
                          data-word={placed}
                          onDragStart={(event) => handleChipDragStart(event, placed)}
                          onDragEnd={handleChipDragEnd}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!answered) {
                              removeWordFromZone(itemIndex);
                            }
                          }}
                        >
                          {placed}
                        </span>
                      ) : !answered ? (
                        <span className="law-drop-placeholder">kéo từ vào đây</span>
                      ) : null}
                      {answered && itemCorrect === false && item.answer ? (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#c62828',
                            marginTop: 4,
                          }}
                        >
                          Đáp án: {item.answer}
                        </div>
                      ) : null}
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
                ? `Tuyệt vời! Bạn đã đúng tất cả ${currentExercise.items.length} từ!`
                : `Bạn đúng ${checkResult.correctCount}/${currentExercise.items.length} từ. Thử lại nhé!`}
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
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => resetExerciseState(currentExercise)}
              >
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
