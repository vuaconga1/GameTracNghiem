'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  nextEmptyIndex,
  normalizeStatuses,
} from '@/lib/gameCatalog';

import { gradeQuizFillAnswer, gradeQuizOptionAnswer } from './gradeAnswer';

type QuizQuestion = {
  id: string;
  index: number;
  type: string;
  typeLabel: string;
  question: string;
  answer: string;
  fillMode: boolean;
  accept: string[];
  options: string[];
};

type QuizGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  questions?: QuizQuestion[];
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

type QuizStats = {
  total: number;
  correct: number;
  wrong: number;
  pending: number;
};

const OPT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

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

function questionPreview(question: QuizQuestion): string {
  const text = question.question.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const withType = question.typeLabel ? `[${question.typeLabel}] ${text}` : text;
  return withType.length > 50 ? `${withType.slice(0, 50)}...` : withType;
}

export function QuizGame({ courseId }: Props) {
  const [data, setData] = useState<QuizGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
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
        const res = await fetch(`/api/games/quiz/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as QuizGameResponse;
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
  const stats = useMemo<QuizStats>(() => {
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

  useEffect(() => {
    if (panel === 'question') {
      questionStartTime.current = Date.now();
      setInput('');
      setSelectedOption(null);
      setAnswerResult(null);
      setSubmitMessage('');
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    }
  }, [currentIndex, panel]);

  async function persistProgress(nextStatuses: ProgressStatus[], reset = false) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'quiz',
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
          'quiz',
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

  async function handleFillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentQuestion || isSubmitting || answerResult) return;

    if (!input.trim()) {
      setSubmitMessage('Hãy nhập câu trả lời trước khi nộp.');
      return;
    }

    const alreadyAnswered = statuses[currentQuestion.index] !== 'empty';
    const isCorrect = gradeQuizFillAnswer(input, currentQuestion.accept);
    await submitAnswer(isCorrect, alreadyAnswered);
  }

  async function handleOptionClick(option: string) {
    if (!currentQuestion || isSubmitting || answerResult) return;

    setSelectedOption(option);
    const alreadyAnswered = statuses[currentQuestion.index] !== 'empty';
    const isCorrect = gradeQuizOptionAnswer(option, currentQuestion.answer);
    await submitAnswer(isCorrect, alreadyAnswered);
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
      <div className="game-page quiz-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page quiz-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="game-page quiz-page">
        <DataLoading variant="message" message="Chưa có câu hỏi Trắc nghiệm cho khóa học này" />
      </div>
    );
  }

  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page quiz-page">
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
          <h1>Trắc nghiệm</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'question' && currentQuestion ? (
        <div className="game-meta">
          <span className="meta-pill">{course.name || 'Khóa học'}</span>
          <span className="meta-pill type-badge">{currentQuestion.typeLabel}</span>
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
          <div className="list-title">Danh sách câu hỏi</div>
          <div className="list-stats">
            <div className="stat-item">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">Tổng câu</span>
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
                  <span className="q-preview">{questionPreview(question)}</span>
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
            Câu {currentIndex + 1}/{questions.length}
          </span>
          <div
            className="question-text"
            dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
          />

          <div id="answerArea">
            {currentQuestion.fillMode ? (
              <form onSubmit={handleFillSubmit}>
                <div className="fill-input-wrap">
                  <input
                    type="text"
                    className="fill-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={isSubmitting || Boolean(answerResult)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Nhập đáp án..."
                  />
                </div>

                {submitMessage ? (
                  <div className="feedback show wrong">{submitMessage}</div>
                ) : null}

                {answerResult ? (
                  <div className={`feedback show ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
                    <i
                      className={
                        answerResult.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'
                      }
                      aria-hidden="true"
                    />{' '}
                    {answerResult.isCorrect ? (
                      'Chính xác!'
                    ) : (
                      <>
                        Chưa đúng. Đáp án: <strong>{currentQuestion.answer}</strong>
                      </>
                    )}
                    {typeof answerResult.points === 'number' ? (
                      <div className="score-line">{formatPoints(answerResult.points)}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="game-actions">
                  {!answerResult ? (
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      <i className="fas fa-check" aria-hidden="true" />{' '}
                      {isSubmitting ? 'Đang nộp...' : 'Kiểm tra'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={goNext}>
                      {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={() => setPanel('list')}>
                    Về danh sách
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="options-list">
                  {currentQuestion.options.map((option, optIndex) => {
                    let extra = '';
                    if (answerResult) {
                      const isCorrectOpt = gradeQuizOptionAnswer(option, currentQuestion.answer);
                      if (isCorrectOpt) extra = ' correct';
                      else if (selectedOption === option) extra = ' wrong';
                    } else if (selectedOption === option) {
                      extra = ' selected';
                    }
                    return (
                      <button
                        key={`${currentQuestion.id}-${optIndex}`}
                        type="button"
                        className={`option-btn${extra}`}
                        disabled={isSubmitting || Boolean(answerResult)}
                        onClick={() => void handleOptionClick(option)}
                      >
                        <span className="opt-letter">{OPT_LETTERS[optIndex] || optIndex + 1}</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>

                {submitMessage ? (
                  <div className="feedback show wrong">{submitMessage}</div>
                ) : null}

                {answerResult ? (
                  <div className={`feedback show ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
                    <i
                      className={
                        answerResult.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'
                      }
                      aria-hidden="true"
                    />{' '}
                    {answerResult.isCorrect ? 'Chính xác!' : 'Chưa đúng.'}
                    {typeof answerResult.points === 'number' ? (
                      <div className="score-line">{formatPoints(answerResult.points)}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="game-actions">
                  {answerResult ? (
                    <button type="button" className="btn btn-secondary" onClick={goNext}>
                      {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-secondary" onClick={() => setPanel('list')}>
                    Về danh sách
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <div className="result-panel">
            <h2>Hoàn thành!</h2>
            <p>
              Bạn đã trả lời đúng {stats.correct}/{questions.length} câu.
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
