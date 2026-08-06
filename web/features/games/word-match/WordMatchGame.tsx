'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PageBackButton } from '@/components/PageBackButton';
import { GameResultSummary } from '@/components/games/GameScoreHero';
import { usePlayer } from '@/components/player/PlayerContext';
import { finalizePlaySessionIfComplete } from '@/features/scoring/completeSession';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import {
  createPlaySessionId,
  persistGameProgress,
} from '@/features/games/persistProgress';
import { progressCourseKey } from '@/lib/courseKey';
import { hydrateGamePlayerState } from '@/lib/player/guestPlayerAdapter';
import {
  type ProgressStatus,
  normalizeStatuses,
} from '@/lib/gameCatalog';
import type { WordMatchGameData, WordMatchQuestion } from '@/lib/loadWordMatchGame';

import { gradeWordMatchPair } from './gradeAnswer';

type WordMatchGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  questions?: WordMatchQuestion[];
  statuses?: ProgressStatus[];
  playSessionId?: string | null;
  gameScore?: number;
  message?: string;
};

type FeedbackState = {
  isCorrect: boolean;
  message: string;
  points?: number;
};

type Props = {
  courseId: string;
  initialData?: WordMatchGameData | null;
};

type Panel = 'board' | 'result';

type Point = { x: number; y: number };

type MatchLine = {
  key: string;
  from: Point;
  to: Point;
  status: 'preview' | 'correct' | 'wrong';
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardAnchor(
  board: HTMLElement,
  card: HTMLElement,
  side: 'word' | 'image'
): Point {
  const boardRect = board.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  return {
    x: (side === 'word' ? cardRect.right : cardRect.left) - boardRect.left,
    y: cardRect.top + cardRect.height / 2 - boardRect.top,
  };
}

function linePath(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const midX = from.x + dx * 0.5;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

function doneCount(statuses: ProgressStatus[]): number {
  return statuses.filter((status) => status === 'correct').length;
}

function WordMatchImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className="wm-img-placeholder">?</span>;
  }

  return (
    <img
      className="wm-img"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

function initialWordMatchState(initialData?: WordMatchGameData | null) {
  const questions = initialData?.questions || [];
  const statuses = normalizeStatuses(initialData?.statuses, questions.length);
  const allDone = questions.length > 0 && doneCount(statuses) === questions.length;
  return {
    data: initialData || null,
    statuses,
    panel: allDone ? ('result' as const) : ('board' as const),
    playSessionId: initialData?.playSessionId || null,
  };
}

export function WordMatchGame({ courseId, initialData }: Props) {
  const { t, locale } = useI18n();
  const player = usePlayer();
  const numberLocale = locale === 'en' ? 'en-US' : 'vi-VN';

  function formatPoints(points: number): string {
    const sign = points >= 0 ? '+' : '';
    return `${sign}${points.toLocaleString(numberLocale)} ${t('common.points')}`;
  }


  const router = useRouter();
  const initialState = initialWordMatchState(initialData);
  const [data, setData] = useState<WordMatchGameResponse | null>(initialState.data);
  const [statuses, setStatuses] = useState<ProgressStatus[]>(initialState.statuses);
  const [panel, setPanel] = useState<Panel>(initialState.panel);
  const [wordOrder, setWordOrder] = useState<number[]>([]);
  const [imageOrder, setImageOrder] = useState<number[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState(-1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [hintText, setHintText] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [, setGameScore] = useState(0);
  const [playSessionId, setPlaySessionId] = useState<string | null>(initialState.playSessionId);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [wrongPair, setWrongPair] = useState<{ wordIndex: number; imageIndex: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const questionStartTime = useRef(Date.now());
  const didUseInitialData = useRef(Boolean(initialData));
  const boardRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const imageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const rebuildOrders = useCallback((count: number) => {
    const indexes = Array.from({ length: count }, (_, index) => index);
    setWordOrder(shuffleArray(indexes));
    setImageOrder(shuffleArray(indexes));
  }, []);

  useEffect(() => {
    if (didUseInitialData.current && initialData?.course.id === courseId) {
      didUseInitialData.current = false;
      rebuildOrders(initialData.questions.length);
      questionStartTime.current = Date.now();
      return;
    }

    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/word-match/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as WordMatchGameResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.message || t('gameUi.loadFailed'));
        }

        const questions = json.questions || [];
        const courseKey = json.course
          ? progressCourseKey(json.course.name, json.course.levelName)
          : '';
        const hydrated = hydrateGamePlayerState({
          player,
          courseKey,
          game: 'word_match',
          statuses: json.statuses,
          playSessionId: json.playSessionId,
          gameScore: json.gameScore,
        });
        const nextStatuses = normalizeStatuses(hydrated.statuses, questions.length);
        const allDone =
          questions.length > 0 && doneCount(nextStatuses) === questions.length;

        setData(json);
        setStatuses(nextStatuses);
        setPanel(allDone ? 'result' : 'board');
        setSessionPoints(0);
        setGameScore(hydrated.gameScore);
        setPlaySessionId(hydrated.playSessionId);
        rebuildOrders(questions.length);
        questionStartTime.current = Date.now();
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

    return () => controller.abort();
  }, [courseId, initialData, player, rebuildOrders, t]);

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;
  const maxScore = questions.length * 200;
  const correctCount = doneCount(statuses);
  const progressPercent = maxScore ? Math.min(100, Math.round((sessionPoints / maxScore) * 100)) : 0;

  const clearSelection = useCallback(() => {
    setSelectedWordIndex(-1);
    setSelectedImageIndex(-1);
    setHintText('');
    setCursorPos(null);
  }, []);

  const bumpLayout = useCallback(() => {
    setLayoutTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || panel !== 'board') return;

    const observer = new ResizeObserver(() => bumpLayout());
    observer.observe(board);

    const onScroll = () => bumpLayout();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', bumpLayout);

    const raf = requestAnimationFrame(bumpLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', bumpLayout);
      cancelAnimationFrame(raf);
    };
  }, [bumpLayout, panel, wordOrder, imageOrder, statuses]);

  const hasPreviewLine =
    (selectedWordIndex >= 0) !== (selectedImageIndex >= 0);

  useEffect(() => {
    if (!hasPreviewLine || panel !== 'board') {
      setCursorPos(null);
      return;
    }

    const updateFromClient = (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      setCursorPos({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    };

    const onMouseMove = (event: MouseEvent) => {
      updateFromClient(event.clientX, event.clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      updateFromClient(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [hasPreviewLine, panel]);

  const matchLines = useMemo((): MatchLine[] => {
    void layoutTick;
    const board = boardRef.current;
    if (!board || panel !== 'board') return [];

    const lines: MatchLine[] = [];

    statuses.forEach((status, index) => {
      if (status !== 'correct') return;
      const wordEl = wordRefs.current.get(index);
      const imageEl = imageRefs.current.get(index);
      if (!wordEl || !imageEl) return;
      lines.push({
        key: `correct-${index}`,
        from: cardAnchor(board, wordEl, 'word'),
        to: cardAnchor(board, imageEl, 'image'),
        status: 'correct',
      });
    });

    if (wrongPair) {
      const wordEl = wordRefs.current.get(wrongPair.wordIndex);
      const imageEl = imageRefs.current.get(wrongPair.imageIndex);
      if (wordEl && imageEl) {
        lines.push({
          key: `wrong-${wrongPair.wordIndex}-${wrongPair.imageIndex}`,
          from: cardAnchor(board, wordEl, 'word'),
          to: cardAnchor(board, imageEl, 'image'),
          status: 'wrong',
        });
      }
    } else if (hasPreviewLine && cursorPos) {
      if (selectedWordIndex >= 0) {
        const wordEl = wordRefs.current.get(selectedWordIndex);
        if (wordEl) {
          lines.push({
            key: 'preview',
            from: cardAnchor(board, wordEl, 'word'),
            to: cursorPos,
            status: 'preview',
          });
        }
      } else if (selectedImageIndex >= 0) {
        const imageEl = imageRefs.current.get(selectedImageIndex);
        if (imageEl) {
          lines.push({
            key: 'preview',
            from: cursorPos,
            to: cardAnchor(board, imageEl, 'image'),
            status: 'preview',
          });
        }
      }
    }

    return lines;
  }, [
    cursorPos,
    hasPreviewLine,
    layoutTick,
    panel,
    selectedImageIndex,
    selectedWordIndex,
    statuses,
    wrongPair,
  ]);

  async function persistProgress(
    nextStatuses: ProgressStatus[],
    reset = false,
    sessionId?: string | null
  ) {
    if (!course) return null;

    const json = await persistGameProgress({
      courseKey: progressCourseKey(course.name, course.levelName),
      game: 'word_match',
      statuses: nextStatuses,
      reset,
      playSessionId: sessionId === undefined ? playSessionId : sessionId,
      player,
    });
    if (!json.success) {
      throw new Error(json.message || t('gameUi.progressSaveFailed'));
    }
    if (json.statuses) {
      setStatuses(normalizeStatuses(json.statuses, questions.length));
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

  const maybeFinish = useCallback(
    (nextStatuses: ProgressStatus[]) => {
      if (!questions.length || doneCount(nextStatuses) !== questions.length) return;
      setPanel('result');
    },
    [questions.length]
  );

  const checkMatch = useCallback(
    async (wordIndex: number, imageIndex: number) => {
      if (!course || wordIndex < 0 || imageIndex < 0 || isSubmitting || wrongPair) return;

      const isCorrect = gradeWordMatchPair(wordIndex, imageIndex);
      setIsSubmitting(true);
      setSubmitMessage('');

      try {
        const sessionId = await ensurePlaySession();
        const elapsedMs = Date.now() - questionStartTime.current;
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'word_match',
          wordIndex,
          isCorrect,
          elapsedMs,
          sessionId,
          player,
        );
        if (!score.success) {
          throw new Error(score.message || t('gameUi.scoreSaveFailed'));
        }

        let points: number | undefined;
        if (typeof score.points === 'number') {
          points = score.points;
          setSessionPoints((current) => current + points!);
        }
        if (typeof score.gameScore === 'number') {
          setGameScore(score.gameScore);
        }

        if (isCorrect) {
          const question = questions[wordIndex];
          const nextStatuses = [...statuses];
          nextStatuses[wordIndex] = 'correct';
          setStatuses(nextStatuses);
          const sessionIdForProgress = await persistProgress(nextStatuses);
          const finalized = await finalizePlaySessionIfComplete({
            statuses: nextStatuses,
            playSessionId: sessionIdForProgress || sessionId,
            player,
          });
          if (finalized) router.refresh();
          setFeedback({
            isCorrect: true,
            message: question?.hint ? question.hint : '',
            points,
          });
          maybeFinish(nextStatuses);
          clearSelection();
          requestAnimationFrame(bumpLayout);
          setIsSubmitting(false);
        } else {
          setFeedback({
            isCorrect: false,
            message: t('wordMatch.mismatch'),
            points,
          });
          setWrongPair({ wordIndex, imageIndex });
          setTimeout(() => {
            setWrongPair(null);
            clearSelection();
            setIsSubmitting(false);
          }, 600);
        }
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : t('gameUi.submitFailed'));
        clearSelection();
        setIsSubmitting(false);
      }
    },
    [
      bumpLayout,
      clearSelection,
      course,
      isSubmitting,
      maybeFinish,
      player,
      playSessionId,
      questions,
      statuses,
      wrongPair,
    ]
  );

  function seedCursorFromCard(index: number, side: 'word' | 'image') {
    const board = boardRef.current;
    const el = (side === 'word' ? wordRefs : imageRefs).current.get(index);
    if (!board || !el) return;
    const from = cardAnchor(board, el, side);
    setCursorPos({
      x: from.x + (side === 'word' ? 28 : -28),
      y: from.y,
    });
  }

  function handleWordClick(index: number) {
    if (statuses[index] === 'correct' || isSubmitting || wrongPair) return;

    const question = questions[index];
    setSelectedWordIndex(index);
    setHintText(question?.hint || '');
    setFeedback(null);
    setSubmitMessage('');

    if (selectedImageIndex >= 0) {
      void checkMatch(index, selectedImageIndex);
    } else {
      seedCursorFromCard(index, 'word');
      bumpLayout();
    }
  }

  function handleImageClick(index: number) {
    if (statuses[index] === 'correct' || isSubmitting || wrongPair) return;

    setSelectedImageIndex(index);
    setFeedback(null);
    setSubmitMessage('');

    if (selectedWordIndex >= 0) {
      void checkMatch(selectedWordIndex, index);
    } else {
      seedCursorFromCard(index, 'image');
      bumpLayout();
    }
  }

  function handleManualCheck() {
    if (selectedWordIndex < 0 || selectedImageIndex < 0) {
      setFeedback({
        isCorrect: false,
        message: t('wordMatch.selectBoth'),
      });
      return;
    }
    void checkMatch(selectedWordIndex, selectedImageIndex);
  }

  async function resetGame() {
    if (!course || isResetting) return;

    const emptyStatuses = Array.from({ length: questions.length }, () => 'empty' as ProgressStatus);
    const nextSession = createPlaySessionId();

    setIsResetting(true);
    setSubmitMessage('');

    try {
      setStatuses(emptyStatuses);
      setSessionPoints(0);
      setFeedback(null);
      setWrongPair(null);
      clearSelection();
      questionStartTime.current = Date.now();
      rebuildOrders(questions.length);
      setPlaySessionId(nextSession);
      await persistProgress(emptyStatuses, true, nextSession);
      router.refresh();
      setPanel('board');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t('gameUi.redoFailed'));
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="game-page wm-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page wm-page">
        <DataLoading variant="message" message={errorMessage || t('gameUi.notFound')} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="game-page wm-page">
        <DataLoading
          variant="message"
          message={t('wordMatch.empty')}
        />
      </div>
    );
  }

  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page wm-page">
      <PageBackButton href={`/courses/${course.id}`} title={t('common.backToCourse')} />
      <div className="game-top">
        <div className="game-title-wrap">
          <h1>{t('wordMatch.title')}</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'board' ? (
        <>
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

          <div className="game-card" id="playPanel">
            <span className="question-counter-pill">
              {t('gameUi.pairCounter', { current: correctCount, total: questions.length })}
            </span>
            <div className="question-label">{t('wordMatch.instruction')}</div>
            <div className="wm-hint">{hintText}</div>
            <div className="wm-board" ref={boardRef}>
              <svg className="wm-lines" aria-hidden="true">
                <defs>
                  <marker
                    id="wm-arrow-preview"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="var(--primary)" />
                  </marker>
                  <marker
                    id="wm-arrow-correct"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
                  </marker>
                  <marker
                    id="wm-arrow-wrong"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                  </marker>
                </defs>
                {matchLines.map((line) => (
                  <path
                    key={line.key}
                    className={`wm-line is-${line.status}`}
                    d={linePath(line.from, line.to)}
                    markerEnd={`url(#wm-arrow-${line.status})`}
                  />
                ))}
              </svg>
              <div>
                <div className="wm-col-title">
                  <i className="fas fa-font" aria-hidden="true" /> {t('gameUi.vocabularyLabel')}
                </div>
                <div className="wm-list" id="wordList">
                  {wordOrder.map((index) => {
                    const question = questions[index];
                    const classes = ['wm-item'];
                    if (selectedWordIndex === index) classes.push('is-selected');
                    if (statuses[index] === 'correct') classes.push('is-done');
                    if (wrongPair && wrongPair.wordIndex === index) classes.push('is-wrong');
                    return (
                      <div
                        key={`word-${question.id}`}
                        ref={(el) => {
                          if (el) wordRefs.current.set(index, el);
                          else wordRefs.current.delete(index);
                        }}
                        className={classes.join(' ')}
                        onClick={() => handleWordClick(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleWordClick(index);
                          }
                        }}
                        role="button"
                        tabIndex={statuses[index] === 'correct' ? -1 : 0}
                      >
                        <button type="button" className="wm-word-btn">
                          {question.word.toUpperCase()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="wm-col-title">
                  <i className="fas fa-image" aria-hidden="true" /> {t('gameUi.imageLabel')}
                </div>
                <div className="wm-list" id="imageList">
                  {imageOrder.map((index) => {
                    const question = questions[index];
                    const classes = ['wm-item'];
                    if (selectedImageIndex === index) classes.push('is-selected');
                    if (statuses[index] === 'correct') classes.push('is-done');
                    if (wrongPair && wrongPair.imageIndex === index) classes.push('is-wrong');
                    return (
                      <div
                        key={`image-${question.id}`}
                        ref={(el) => {
                          if (el) imageRefs.current.set(index, el);
                          else imageRefs.current.delete(index);
                        }}
                        className={classes.join(' ')}
                        onClick={() => handleImageClick(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleImageClick(index);
                          }
                        }}
                        role="button"
                        tabIndex={statuses[index] === 'correct' ? -1 : 0}
                      >
                        <button type="button" className="wm-img-btn">
                          <WordMatchImage src={question.image} alt={question.word} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="wm-progress-line">
              {t('gameUi.correctCountPairs', { correct: correctCount, total: questions.length })}
            </div>

            {submitMessage ? (
              <div className="feedback show wrong">{submitMessage}</div>
            ) : null}

            {feedback ? (
              <div className={`feedback show ${feedback.isCorrect ? 'correct' : 'wrong'}`}>
                <i
                  className={
                    feedback.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'
                  }
                  aria-hidden="true"
                />{' '}
                {feedback.isCorrect ? (
                  <>
                    {t('wordMatch.matchedAll')}{' '}
                    {feedback.message ? <strong>{feedback.message}</strong> : null}
                  </>
                ) : (
                  feedback.message
                )}
                {typeof feedback.points === 'number' ? (
                  <div className="score-line">{formatPoints(feedback.points)}</div>
                ) : null}
              </div>
            ) : null}

            <div className="game-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleManualCheck}
                disabled={isSubmitting}
              >
                <i className="fas fa-check" aria-hidden="true" />{' '}
                {isSubmitting ? t('common.checking') : t('common.checkAnswers')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearSelection}>
                {t('wordMatch.clearSelection')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void resetGame()}
                disabled={isResetting}
              >
                {isResetting ? t('common.redoing') : t('common.redo')}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <GameResultSummary
            correct={correctCount}
            total={questions.length}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void resetGame()}
              disabled={isResetting}
            >
              {isResetting ? t('common.redoing') : t('common.redo')}
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
