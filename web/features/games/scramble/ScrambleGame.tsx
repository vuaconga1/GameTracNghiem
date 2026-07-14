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

import { gradeScrambleAnswer } from './gradeAnswer';

type ScrambleQuestion = {
  id: string;
  index: number;
  word: string;
  hint: string;
  image: string;
};

type ScrambleGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  questions?: ScrambleQuestion[];
  statuses?: ProgressStatus[];
  message?: string;
};

type AnswerResult = {
  isCorrect: boolean;
  points?: number;
};

type Props = {
  courseId: string;
};

type Panel = 'list' | 'question' | 'result';

type ScrambleStats = {
  total: number;
  correct: number;
  wrong: number;
  pending: number;
};

type PoolLetter = {
  id: number;
  ch: string;
  used: boolean;
};

type SlotLetter = {
  id: number;
  ch: string;
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

function wordLetters(word: string): string[] {
  return String(word || '')
    .replace(/\s+/g, '')
    .split('');
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scrambleLetters(word: string): string[] {
  const letters = wordLetters(word);
  if (letters.length < 2) return letters;
  let scrambled = shuffleArray(letters);
  let guard = 0;
  while (scrambled.join('') === letters.join('') && guard < 12) {
    scrambled = shuffleArray(letters);
    guard += 1;
  }
  return scrambled;
}

function formatScrambledDots(letters: string[]): string {
  return letters.map((ch) => String(ch).toUpperCase()).join('.');
}

function questionPreview(question: ScrambleQuestion, status: ProgressStatus, listPos: number): string {
  if (status === 'correct' || status === 'wrong') {
    return String(question.word).toUpperCase();
  }
  return `Từ ${listPos + 1}`;
}

export function ScrambleGame({ courseId }: Props) {
  const [data, setData] = useState<ScrambleGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [poolLetters, setPoolLetters] = useState<PoolLetter[]>([]);
  const [slotLetters, setSlotLetters] = useState<Array<SlotLetter | null>>([]);
  const [scrambledDisplay, setScrambledDisplay] = useState('');
  const questionStartTime = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/scramble/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as ScrambleGameResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không tải được trò chơi');
        }

        const questions = json.questions || [];
        const nextStatuses = normalizeStatuses(json.statuses, questions.length);
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

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;
  const currentQuestion = questions[currentIndex];
  const maxScore = questions.length * 200;
  const stats = useMemo<ScrambleStats>(() => {
    const correct = statuses.filter((status) => status === 'correct').length;
    const wrong = statuses.filter((status) => status === 'wrong').length;
    return {
      total: questions.length,
      correct,
      wrong,
      pending: Math.max(questions.length - correct - wrong, 0),
    };
  }, [questions.length, statuses]);
  const progressPercent = maxScore ? Math.min(100, Math.round((sessionPoints / maxScore) * 100)) : 0;

  const buildBoard = useCallback((word: string) => {
    const letters = scrambleLetters(word);
    setScrambledDisplay(formatScrambledDots(letters));
    setPoolLetters(
      letters.map((ch, id) => ({
        id,
        ch,
        used: false,
      }))
    );
    setSlotLetters(wordLetters(word).map(() => null));
  }, []);

  useEffect(() => {
    if (panel === 'question' && currentQuestion) {
      questionStartTime.current = Date.now();
      setAnswerResult(null);
      setSubmitMessage('');
      buildBoard(currentQuestion.word);
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    }
  }, [buildBoard, currentIndex, currentQuestion, panel]);

  async function persistProgress(nextStatuses: ProgressStatus[], reset = false) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'scramble',
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
      setStatuses(normalizeStatuses(json.statuses, questions.length));
    }
  }

  function goNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setPanel('result');
      return;
    }
    setCurrentIndex(nextIndex);
  }

  function scheduleAdvance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      goNext();
    }, 900);
  }

  const slotsFull = useMemo(
    () => slotLetters.length > 0 && slotLetters.every((slot) => Boolean(slot)),
    [slotLetters]
  );

  async function submitAnswer(isCorrect: boolean, alreadyAnswered: boolean) {
    if (!course || !currentQuestion) return;

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      let points: number | undefined;

      if (!alreadyAnswered) {
        const elapsedMs = Date.now() - questionStartTime.current;
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'scramble',
          currentQuestion.index,
          isCorrect,
          elapsedMs
        );
        if (!score.success) {
          throw new Error(score.message || 'Không ghi được điểm');
        }
        points = score.points;
        if (typeof points === 'number') {
          setSessionPoints((current) => current + points!);
        }
      }

      const nextStatuses = [...statuses];
      nextStatuses[currentQuestion.index] = isCorrect ? 'correct' : 'wrong';
      setStatuses(nextStatuses);
      if (!alreadyAnswered) {
        await persistProgress(nextStatuses);
      }

      setAnswerResult({ isCorrect, points });
      scheduleAdvance();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không nộp được câu trả lời');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function finishAnswer(userAnswer?: string) {
    if (!currentQuestion || isSubmitting || answerResult) return;

    const answer =
      userAnswer ??
      slotLetters
        .map((item) => (item ? item.ch : ''))
        .join('');
    if (!answer || answer.length < wordLetters(currentQuestion.word).length) return;

    const alreadyAnswered = statuses[currentQuestion.index] !== 'empty';
    const isCorrect = gradeScrambleAnswer(answer, currentQuestion.word);
    await submitAnswer(isCorrect, alreadyAnswered);
  }

  function placeLetter(letterId: number) {
    if (answerResult || isSubmitting) return;

    const letter = poolLetters.find((item) => item.id === letterId && !item.used);
    if (!letter) return;

    const emptyIdx = slotLetters.findIndex((slot) => !slot);
    if (emptyIdx < 0) return;

    const nextSlots = [...slotLetters];
    nextSlots[emptyIdx] = { id: letter.id, ch: letter.ch };
    const nextPool = poolLetters.map((item) =>
      item.id === letterId ? { ...item, used: true } : item
    );

    setPoolLetters(nextPool);
    setSlotLetters(nextSlots);

    if (nextSlots.every((slot) => Boolean(slot))) {
      const userAnswer = nextSlots.map((item) => (item ? item.ch : '')).join('');
      void finishAnswer(userAnswer);
    }
  }

  function removeFromSlot(slotIdx: number) {
    if (answerResult || isSubmitting) return;

    const item = slotLetters[slotIdx];
    if (!item) return;

    setPoolLetters((current) =>
      current.map((poolItem) =>
        poolItem.id === item.id ? { ...poolItem, used: false } : poolItem
      )
    );
    setSlotLetters((current) => {
      const next = [...current];
      next[slotIdx] = null;
      return next;
    });
  }

  function clearBoard() {
    if (answerResult || isSubmitting) return;

    setPoolLetters((current) => current.map((item) => ({ ...item, used: false })));
    setSlotLetters((current) => current.map(() => null));
  }

  function openQuestion(index: number) {
    setCurrentIndex(index);
    setPanel('question');
  }

  function startOrContinue() {
    const firstEmptyIndex = nextEmptyIndex(statuses);
    if (firstEmptyIndex === -1) return;
    openQuestion(firstEmptyIndex);
  }

  async function resetProgress(openFirstQuestion: boolean) {
    if (!course || isResetting) return;

    const emptyStatuses = Array.from({ length: questions.length }, () => 'empty' as ProgressStatus);

    setIsResetting(true);
    setSubmitMessage('');

    try {
      setStatuses(emptyStatuses);
      setSessionPoints(0);
      setAnswerResult(null);
      setCurrentIndex(0);
      await persistProgress(emptyStatuses, true);
      setPanel(openFirstQuestion ? 'question' : 'list');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không làm lại được bài');
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="game-page scramble-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page scramble-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="game-page scramble-page">
        <DataLoading variant="message" message="Chưa có từ Sắp xếp cho khóa học này" />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;
  const answered = Boolean(answerResult);

  return (
    <div className="game-page scramble-page">
      <div className="game-top">
        <button
          type="button"
          className="game-back"
          title={panel === 'question' ? 'Về danh sách' : 'Quay lại khóa học'}
          aria-label={panel === 'question' ? 'Về danh sách' : 'Quay lại khóa học'}
          onClick={() => {
            if (panel === 'question') {
              setPanel('list');
            } else {
              window.location.href = `/courses/${course.id}`;
            }
          }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </button>
        <div className="game-title-wrap">
          <h1>Sắp xếp từ vựng</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'question' && currentQuestion ? (
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
          <div className="list-title">Danh sách từ</div>
          <div className="list-stats">
            <div className="stat-item">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">Tổng từ</span>
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
            {questions.map((question, index) => {
              const status = statuses[index] || 'empty';
              return (
                <div
                  key={question.id}
                  role="button"
                  tabIndex={0}
                  className={`q-list-item ${statusClass(status)}`}
                  onClick={() => openQuestion(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openQuestion(index);
                    }
                  }}
                >
                  <span className="q-num">{index + 1}</span>
                  <span className="q-preview">{questionPreview(question, status, index)}</span>
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

      {panel === 'question' && currentQuestion ? (
        <div className="game-card" id="questionPanel">
          <span className="question-counter-pill">
            Từ {currentIndex + 1}/{questions.length}
          </span>
          <div className="question-label">Sắp xếp các chữ thành từ đúng</div>
          <div className="scramble-display">{scrambledDisplay}</div>

          {currentQuestion.image ? (
            <div className="scramble-image-wrap">
              <img src={currentQuestion.image} alt={currentQuestion.word} />
            </div>
          ) : null}

          {currentQuestion.hint ? (
            <div className="hint-box">
              <i className="fas fa-lightbulb" aria-hidden="true" />
              <span>{currentQuestion.hint}</span>
            </div>
          ) : null}

          <div className="scramble-slot-row" aria-label="Ô xếp chữ">
            {slotLetters.map((slot, slotIdx) => {
              let extra = '';
              if (slot) extra += ' is-filled';
              if (answerResult) {
                extra += answerResult.isCorrect ? ' is-correct' : ' is-wrong';
              }
              return (
                <button
                  key={`slot-${currentQuestion.id}-${slotIdx}`}
                  type="button"
                  className={`scramble-slot${extra}`}
                  disabled={answered || isSubmitting}
                  onClick={() => removeFromSlot(slotIdx)}
                >
                  {slot ? String(slot.ch).toUpperCase() : ''}
                </button>
              );
            })}
          </div>

          <div className="scramble-pool" aria-label="Chữ cái đảo">
            {poolLetters.map((letter) => (
              <button
                key={`chip-${currentQuestion.id}-${letter.id}`}
                type="button"
                className={`scramble-chip${letter.used ? ' is-used' : ''}`}
                disabled={letter.used || answered || isSubmitting}
                onClick={() => placeLetter(letter.id)}
              >
                {String(letter.ch).toUpperCase()}
              </button>
            ))}
          </div>

          {submitMessage ? <div className="feedback show wrong">{submitMessage}</div> : null}

          {answerResult ? (
            <div className={`feedback show ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
              <i
                className={answerResult.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'}
                aria-hidden="true"
              />{' '}
              {answerResult.isCorrect ? (
                <>
                  Chính xác! <strong>{String(currentQuestion.word).toUpperCase()}</strong>
                </>
              ) : (
                <>
                  Chưa đúng. Đáp án: <strong>{String(currentQuestion.word).toUpperCase()}</strong>
                </>
              )}
              {typeof answerResult.points === 'number' ? (
                <div className="score-line">{formatPoints(answerResult.points)}</div>
              ) : null}
            </div>
          ) : null}

          <div className="game-actions">
            {!answered ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearBoard}
                  disabled={isSubmitting}
                >
                  Xóa
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!slotsFull || isSubmitting}
                  onClick={() => void finishAnswer()}
                >
                  <i className="fas fa-check" aria-hidden="true" />{' '}
                  {isSubmitting ? 'Đang nộp...' : 'Kiểm tra đáp án'}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={goNext}>
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Từ tiếp theo'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setPanel('list')}>
              Về danh sách
            </button>
          </div>
        </div>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <div className="result-panel">
            <h2>Hoàn thành!</h2>
            <p>
              Bạn đã trả lời đúng {stats.correct}/{questions.length} từ.
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
