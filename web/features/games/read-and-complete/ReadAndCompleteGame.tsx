'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PageBackButton } from '@/components/PageBackButton';
import { GameResultSummary } from '@/components/games/GameScoreHero';
import { finalizePlaySessionIfComplete } from '@/features/scoring/completeSession';
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

import { gradeReadAndCompleteExercise } from './gradeAnswer';

type ReadAndCompleteItem = {
  order: number;
  sentence: string;
  hint_image: string;
  answer: string;
};

type ReadAndCompleteExercise = {
  id: string;
  index: number;
  title: string;
  instruction: string;
  word_bank: string[];
  items: ReadAndCompleteItem[];
};

type ReadAndCompleteGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  exercises?: ReadAndCompleteExercise[];
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

function exercisePreview(
  exercise: ReadAndCompleteExercise,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const sub = `${t('gameUi.sentenceCountBadge', { count: exercise.items.length })} · ${exercise.instruction || 'Read and complete.'}`;
  return sub.length > 60 ? `${sub.slice(0, 60)}...` : sub;
}

function splitSentence(sentence: string): [string, string] {
  const parts = sentence.split('___');
  return [parts[0] || '', parts[1] || ''];
}

export function ReadAndCompleteGame({ courseId }: Props) {
  const { t, locale } = useI18n();
  const numberLocale = locale === 'en' ? 'en-US' : 'vi-VN';

  function formatPoints(points: number): string {
    const sign = points >= 0 ? '+' : '';
    return `${sign}${points.toLocaleString(numberLocale)} ${t('common.points')}`;
  }


  const router = useRouter();
  const [data, setData] = useState<ReadAndCompleteGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [dragWord, setDragWord] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
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
  const autoCheckPending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/read-and-complete/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as ReadAndCompleteGameResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.message || t('gameUi.loadFailed'));
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
        setErrorMessage(err instanceof Error ? err.message : t('gameUi.loadFailed'));
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

  const usedWords = useMemo(
    () => Object.values(placements).filter(Boolean),
    [placements]
  );

  const availableWords = useMemo(() => {
    if (!currentExercise) return [];
    return currentExercise.word_bank.filter((word) => !usedWords.includes(word));
  }, [currentExercise, usedWords]);

  const resetExerciseState = useCallback(() => {
    setPlacements({});
    setDragWord(null);
    setDropTargetIndex(null);
    setDragPoint(null);
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
        const filled: Record<number, string> = {};
        currentExercise.items.forEach((item, index) => {
          filled[index] = item.answer;
        });
        setPlacements(filled);
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
      game: 'read_and_complete',
      statuses: nextStatuses,
      reset,
      playSessionId: sessionId === undefined ? playSessionId : sessionId,
    });
    if (!json.success) {
      throw new Error(json.message || t('gameUi.progressSaveFailed'));
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
    setDragWord(null);
    setDropTargetIndex(null);
    setDragPoint(null);
  }

  function clearBlank(itemIndex: number) {
    if (answered) return;
    setPlacements((current) => {
      if (!current[itemIndex]) return current;
      const next = { ...current };
      delete next[itemIndex];
      return next;
    });
  }

  function blankIndexFromPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const blank = el.closest('[data-rc-blank]') as HTMLElement | null;
    if (!blank) return null;
    const idx = Number(blank.dataset.rcBlank);
    return Number.isFinite(idx) ? idx : null;
  }

  function beginWordDrag(word: string, clientX: number, clientY: number, withGhost: boolean) {
    if (answered) return;
    setDragWord(word);
    setDragPoint(withGhost ? { x: clientX, y: clientY } : null);
    setDropTargetIndex(null);
  }

  function moveWordDrag(clientX: number, clientY: number) {
    if (!dragWord) return;
    setDragPoint({ x: clientX, y: clientY });
    setDropTargetIndex(blankIndexFromPoint(clientX, clientY));
  }

  function endWordDrag(clientX: number, clientY: number) {
    if (!dragWord) return;
    const target = blankIndexFromPoint(clientX, clientY);
    if (target !== null) {
      placeWord(target, dragWord);
      return;
    }
    setDragWord(null);
    setDropTargetIndex(null);
    setDragPoint(null);
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

    const allFilled = currentExercise.items.every((_, index) => Boolean(placements[index]));
    if (!allFilled) {
      setSubmitMessage(t('gameUi.fillAllBlanks'));
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const { isCorrect, itemResults } = gradeReadAndCompleteExercise(
        placements,
        currentExercise.items
      );
      const elapsedMs = Date.now() - questionStartTime.current;
      const sessionId = await ensurePlaySession();
      let pointsEarned = 0;

      for (let itemIndex = 0; itemIndex < currentExercise.items.length; itemIndex += 1) {
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'read_and_complete',
          currentExercise.index * 100 + itemIndex,
          itemResults[itemIndex],
          elapsedMs,
          sessionId
        );
        if (!score.success) {
          throw new Error(score.message || t('gameUi.scoreSaveFailed'));
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
      const sessionIdForProgress = await persistProgress(nextStatuses);
      const finalized = await finalizePlaySessionIfComplete({
        statuses: nextStatuses,
        playSessionId: sessionIdForProgress || playSessionId,
      });
      if (finalized) router.refresh();

      setAnswered(true);
      setCheckResult({
        isCorrect,
        correctCount: itemResults.filter(Boolean).length,
        itemResults,
        pointsEarned,
      });
      scheduleAdvance(nextStatuses);
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t('gameUi.submitFailed'));
    } finally {
      setIsSubmitting(false);
      autoCheckPending.current = false;
    }
  }, [
    answered,
    course,
    currentExercise,
    isSubmitting,
    placements,
    statuses,
  ]);

  useEffect(() => {
    if (!currentExercise || answered || isSubmitting || autoCheckPending.current) return;
    const allFilled = currentExercise.items.every((_, index) => Boolean(placements[index]));
    if (!allFilled) return;
    autoCheckPending.current = true;
    void handleCheck();
  }, [answered, currentExercise, handleCheck, isSubmitting, placements]);

  function openExercise(index: number) {
    void (async () => {
      try {
        await ensurePlaySession();
        setCurrentIndex(index);
        setPanel('game');
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : t('gameUi.openFailed'));
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
      router.refresh();
      setPanel(openFirstExercise ? 'game' : 'list');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t('gameUi.redoFailed'));
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="game-page rc-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page rc-page">
        <DataLoading variant="message" message={errorMessage || t('gameUi.notFound')} />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="game-page rc-page">
        <DataLoading variant="message" message={t('readAndComplete.empty')} />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? t('common.restartFromStart') : t('common.startExercise');
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page rc-page">
      <PageBackButton
        title={panel === 'game' ? t('common.backToList') : t('common.backToCourse')}
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
          <h1>{t('readAndComplete.title')}</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'list' ? (
        <div className="rc-banner">
          <h2>{t('gameUi.dragWordHint')}</h2>
          <p>{course.name}</p>
        </div>
      ) : null}

      {panel === 'game' && currentExercise ? (
        <div className="game-meta">
          <span className="meta-pill">{course.name || t('gameUi.courseLabel')}</span>
          <span className="meta-pill meta-score-pill">
            {t('gameUi.sessionScore', { earned: sessionPoints.toLocaleString(numberLocale), max: maxScore.toLocaleString(numberLocale) })}
          </span>
          <div
            className="progress-bar-wrap"
            aria-label={t('gameUi.sessionScoreAria', { earned: sessionPoints, max: maxScore })}
          >
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : null}

      {panel === 'list' ? (
        <div className="game-card" id="listPanel">
          <div className="list-title">{t('gameUi.exerciseList')}</div>
          <div className="list-stats">
            <div className="stat-item">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">{t('gameUi.totalExercises')}</span>
            </div>
            <div className="stat-item correct">
              <span className="stat-num">{stats.correct}</span>
              <span className="stat-label">{t('gameUi.correct')}</span>
            </div>
            <div className="stat-item wrong">
              <span className="stat-num">{stats.wrong}</span>
              <span className="stat-label">{t('gameUi.wrong')}</span>
            </div>
            <div className="stat-item pending">
              <span className="stat-num">{stats.pending}</span>
              <span className="stat-label">{t('gameUi.pending')}</span>
            </div>
          </div>
          <div className="game-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={allAnswered ? () => void resetProgress(true) : startOrContinue}
              disabled={isResetting}
            >
              {isResetting ? t('common.redoing') : startLabel}
            </button>
            {allAnswered ? (
              <button type="button" className="btn btn-secondary" onClick={() => setPanel('result')}>
                {t('gameUi.seeResults')}
              </button>
            ) : null}
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
                      {exercisePreview(exercise, t)}
                    </small>
                  </span>
                  <span className="q-status">{statusIcon(status)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {panel === 'game' && currentExercise ? (
        <div className="game-card" id="gamePanel">
          <div className="rc-meta-row">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setPanel('list')}
            >
              <i className="fas fa-list" aria-hidden="true" /> {t('gameUi.list')}
            </button>
          </div>

          <div className="rc-worksheet">
            <span className="question-counter-pill">
              {t('gameUi.exerciseCounter', { current: currentIndex + 1, total: exercises.length })}
            </span>
            <h2 className="rc-ws-title">{currentExercise.title}</h2>
            <p className="rc-ws-instruction">{currentExercise.instruction}</p>

            <div className="rc-bank" aria-label={t('gameUi.dragWordHint')}>
              {availableWords.map((word) => (
                <span
                  key={word}
                  className={`rc-chip${dragWord === word ? ' is-dragging' : ''}`}
                  draggable={!answered}
                  onDragStart={(event) => {
                    if (answered) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.setData('text/plain', word);
                    event.dataTransfer.effectAllowed = 'move';
                    beginWordDrag(word, event.clientX, event.clientY, false);
                  }}
                  onDragEnd={(event) => {
                    endWordDrag(event.clientX, event.clientY);
                  }}
                  onPointerDown={(event) => {
                    if (answered || event.button !== 0) return;
                    // Native HTML5 drag handles mouse; pointer capture for touch
                    if (event.pointerType === 'touch') {
                      event.preventDefault();
                      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                      beginWordDrag(word, event.clientX, event.clientY, true);
                    }
                  }}
                  onPointerMove={(event) => {
                    if (event.pointerType !== 'touch' || !dragWord) return;
                    moveWordDrag(event.clientX, event.clientY);
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerType !== 'touch') return;
                    endWordDrag(event.clientX, event.clientY);
                  }}
                  onPointerCancel={() => {
                    setDragWord(null);
                    setDropTargetIndex(null);
                    setDragPoint(null);
                  }}
                >
                  {word}
                </span>
              ))}
            </div>

            <div className="rc-sentence-list">
              {currentExercise.items.map((item, itemIndex) => {
                const [before, after] = splitSentence(item.sentence);
                const placed = placements[itemIndex];
                const itemCorrect = checkResult?.itemResults[itemIndex];
                const blankClass = [
                  'rc-blank',
                  answered && itemCorrect === true ? 'is-correct' : '',
                  answered && itemCorrect === false ? 'is-wrong' : '',
                  !answered && dropTargetIndex === itemIndex ? 'is-drop-target' : '',
                  !answered && placed ? 'is-filled' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div key={`${currentExercise.id}-${itemIndex}`} className="rc-row">
                    {item.hint_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.hint_image} alt="hint" loading="lazy" />
                    ) : null}
                    <div className="rc-sentence">
                      {before}
                      <span
                        data-rc-blank={itemIndex}
                        className={blankClass}
                        onDragOver={(event) => {
                          if (answered) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          setDropTargetIndex(itemIndex);
                        }}
                        onDragLeave={() => {
                          setDropTargetIndex((current) => (current === itemIndex ? null : current));
                        }}
                        onDrop={(event) => {
                          if (answered) return;
                          event.preventDefault();
                          const word =
                            event.dataTransfer.getData('text/plain') || dragWord || '';
                          if (word) placeWord(itemIndex, word);
                        }}
                        onClick={() => {
                          if (answered) return;
                          if (placed) clearBlank(itemIndex);
                        }}
                        title={
                          answered
                            ? undefined
                            : placed
                              ? t('gameUi.removeWord')
                              : t('gameUi.dropHere')
                        }
                      >
                        {answered && itemCorrect === false ? item.answer : placed || '…'}
                      </span>
                      {after}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {dragWord && dragPoint ? (
            <div
              className="rc-drag-ghost"
              style={{ left: dragPoint.x, top: dragPoint.y }}
              aria-hidden="true"
            >
              {dragWord}
            </div>
          ) : null}

          {submitMessage ? <div className="feedback show wrong">{submitMessage}</div> : null}

          {checkResult ? (
            <div className={`feedback show ${checkResult.isCorrect ? 'correct' : 'wrong'}`}>
              <i
                className={checkResult.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'}
                aria-hidden="true"
              />{' '}
              {checkResult.isCorrect
                ? t('readAndComplete.allCorrect', { total: currentExercise.items.length })
                : t('gameUi.correctCountSentences', { correct: checkResult.correctCount, total: currentExercise.items.length })}
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
                {isSubmitting ? t('common.checking') : t('common.checkAnswers')}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => goNextExercise()}>
                {currentIndex + 1 >= exercises.length ? t('gameUi.seeResults') : t('gameUi.nextExercise')}
              </button>
            )}
            {!answered ? (
              <button type="button" className="btn btn-secondary" onClick={resetExerciseState}>
                {t('common.redoThis')}
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
              {isResetting ? t('common.redoing') : t('common.redo')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPanel('list')}>
              {t('common.backToList')}
            </button>
            <Link href={`/courses/${course.id}`} className="btn btn-secondary">
              {t('common.backToCourse')}
            </Link>
          </GameResultSummary>
        </div>
      ) : null}
    </div>
  );
}
