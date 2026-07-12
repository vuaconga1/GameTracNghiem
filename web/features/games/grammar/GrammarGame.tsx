'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { progressCourseKey } from '@/lib/courseKey';

import { gradeGrammarAnswer } from './gradeAnswer';

type ProgressStatus = 'empty' | 'correct' | 'wrong';

type GrammarQuestion = {
  id: string;
  index: number;
  source: string;
  prefix: string;
  suffix: string;
  hint: string;
  answers: string[];
};

type GrammarGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  questions?: GrammarQuestion[];
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

type GrammarCourse = NonNullable<GrammarGameResponse['course']>;

type GrammarStats = {
  total: number;
  correct: number;
  wrong: number;
  pending: number;
};

type GrammarGameContentProps = {
  courseId: string;
  course: GrammarCourse;
  questions: GrammarQuestion[];
  statuses: readonly ProgressStatus[];
  panel: Panel;
  currentIndex: number;
  input: string;
  answerResult: AnswerResult | null;
  submitMessage: string;
  sessionPoints: number;
  isSubmitting: boolean;
  completedCount: number;
  progressPercent: number;
  stats: GrammarStats;
  onBackHome: () => void;
  onBackToList: () => void;
  onOpenQuestion: (index: number) => void;
  onStartContinue: () => void;
  onRetry: () => void;
  onRetryFromStart: () => void;
  onViewResult: () => void;
  isResetting: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNext: () => void;
};

function normalizeStatuses(statuses: ProgressStatus[] | undefined, questionCount: number): ProgressStatus[] {
  return Array.from({ length: questionCount }, (_, index) => statuses?.[index] || 'empty');
}

function nextEmptyIndex(statuses: ProgressStatus[]): number {
  return statuses.findIndex((status) => status === 'empty');
}

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

function statusText(status: ProgressStatus): string {
  if (status === 'correct') return 'Đúng';
  if (status === 'wrong') return 'Sai';
  return 'Chưa làm';
}

function questionPreview(question: GrammarQuestion): string {
  const preview = question.source || `${question.prefix} ${question.suffix}`.trim();
  return preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
}

function answerSample(question: GrammarQuestion): string {
  return `${question.prefix} ${question.answers[0] || ''} ${question.suffix}`.replace(/\s+/g, ' ').trim();
}

export function GrammarGameContent({
  courseId,
  course,
  questions,
  statuses,
  panel,
  currentIndex,
  input,
  answerResult,
  submitMessage,
  sessionPoints,
  isSubmitting,
  completedCount,
  progressPercent,
  stats,
  onBackHome,
  onBackToList,
  onOpenQuestion,
  onStartContinue,
  onRetry,
  onRetryFromStart,
  onViewResult,
  isResetting,
  onInputChange,
  onSubmit,
  onNext,
}: GrammarGameContentProps) {
  const currentQuestion = questions[currentIndex];
  const firstPending = statuses.findIndex((status) => status === 'empty');
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page">
      <div className="game-top">
        <button
          type="button"
          className="game-back"
          title={panel === 'question' ? 'Về danh sách' : 'Quay lại khóa học'}
          aria-label={panel === 'question' ? 'Về danh sách' : 'Quay lại khóa học'}
          onClick={panel === 'question' ? onBackToList : onBackHome}
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </button>
        <div className="game-title-wrap">
          <h1>Viết lại câu</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'question' ? (
        <div className="game-meta">
          <span className="meta-pill">{course.name || 'Khóa học'}</span>
          <span className="meta-pill meta-score-pill">
            {formatPoints(sessionPoints)}
          </span>
          <div
            className="progress-bar-wrap"
            aria-label={`Đã hoàn thành ${completedCount}/${questions.length} câu`}
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
                <button
                  type="button"
                  key={question.id}
                  className={`q-list-item ${statusClass(status)}`}
                  onClick={() => onOpenQuestion(index)}
                >
                  <span className="q-num">{index + 1}</span>
                  <span className="q-preview">{questionPreview(question)}</span>
                  <span className="q-status">{statusIcon(status)}</span>
                </button>
              );
            })}
          </div>
          <div className="game-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={allAnswered ? onRetryFromStart : onStartContinue}
              disabled={isResetting}
            >
              {isResetting ? 'Đang làm lại...' : startLabel}
            </button>
            {allAnswered ? (
              <button type="button" className="btn btn-secondary" onClick={onViewResult}>
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
          <div className="question-label">Câu mẫu</div>
          <div className="source-sentence">
            {currentQuestion.source || answerSample(currentQuestion)}
          </div>

          <div className="rewrite-label">Viết lại câu theo mẫu:</div>
          <form onSubmit={onSubmit}>
            <div className="rewrite-row">
              <span className="rewrite-prefix">{currentQuestion.prefix}</span>
              <input
                type="text"
                className="rewrite-input"
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                disabled={isSubmitting || Boolean(answerResult)}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="rewrite-suffix">{currentQuestion.suffix}</span>
            </div>

            {currentQuestion.hint ? (
              <div className="hint-box">
                <i className="fas fa-lightbulb" aria-hidden="true" />
                <span>{currentQuestion.hint}</span>
              </div>
            ) : null}

            {submitMessage ? (
              <div className="feedback show wrong">{submitMessage}</div>
            ) : null}

            {answerResult ? (
              <div className={`feedback show ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
                <i
                  className={answerResult.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle'}
                  aria-hidden="true"
                />{' '}
                {answerResult.isCorrect ? (
                  'Chính xác!'
                ) : (
                  <>
                    Chưa đúng. Gợi ý: <strong>{answerSample(currentQuestion)}</strong>
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
                  {isSubmitting ? 'Đang nộp...' : 'Kiểm tra đáp án'}
                </button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={onNext}>
                  {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onBackToList}>
                Về danh sách
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <div className="result-panel">
            <h2>Hoàn thành!</h2>
            <p>
              Bạn đã trả lời đúng {stats.correct}/{questions.length} câu. Tổng điểm phiên:{' '}
              {formatPoints(sessionPoints)}.
            </p>
            <div className="question-list">
              {questions.map((question, index) => {
                const status = statuses[index] || 'empty';
                return (
                  <div key={question.id} className={`q-list-item ${statusClass(status)}`}>
                    <span className="q-num">{index + 1}</span>
                    <span className="q-preview">{questionPreview(question)}</span>
                    <span className="q-status">{statusText(status)}</span>
                  </div>
                );
              })}
            </div>
            <div className="game-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRetry}
                disabled={isResetting}
              >
                {isResetting ? 'Đang làm lại...' : 'Làm lại'}
              </button>
              <Link href={`/courses/${courseId}`} className="btn btn-secondary">
                Quay lại khóa học
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GrammarGame({ courseId }: Props) {
  const [data, setData] = useState<GrammarGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const questionStartTime = useRef(Date.now());

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/grammar/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as GrammarGameResponse;
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

    return () => controller.abort();
  }, [courseId]);

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;
  const currentQuestion = questions[currentIndex];
  const completedCount = statuses.filter((status) => status !== 'empty').length;
  const stats = useMemo<GrammarStats>(() => {
    const correct = statuses.filter((status) => status === 'correct').length;
    const wrong = statuses.filter((status) => status === 'wrong').length;
    return {
      total: questions.length,
      correct,
      wrong,
      pending: Math.max(questions.length - correct - wrong, 0),
    };
  }, [questions.length, statuses]);
  const progressPercent = questions.length ? Math.round((completedCount / questions.length) * 100) : 0;

  useEffect(() => {
    if (panel === 'question') {
      questionStartTime.current = Date.now();
      setInput('');
      setAnswerResult(null);
      setSubmitMessage('');
    }
  }, [currentIndex, panel]);

  async function persistProgress(nextStatuses: ProgressStatus[], reset = false) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'grammar',
        statuses: nextStatuses,
        reset,
      }),
    });
    const json = (await res.json()) as { success: boolean; statuses?: ProgressStatus[]; message?: string };
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Không lưu được tiến độ');
    }
    if (json.statuses) {
      setStatuses(normalizeStatuses(json.statuses, questions.length));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course || !currentQuestion || isSubmitting || answerResult) return;

    if (!input.trim()) {
      setSubmitMessage('Hãy nhập câu trả lời trước khi nộp.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const isCorrect = gradeGrammarAnswer(input, currentQuestion.answers);
      const elapsedMs = Date.now() - questionStartTime.current;
      const score = await submitAnswerScore(
        course.name,
        'grammar',
        currentQuestion.index,
        isCorrect,
        elapsedMs
      );

      if (!score.success) {
        throw new Error(score.message || 'Không ghi được điểm');
      }

      const nextStatuses = [...statuses];
      nextStatuses[currentQuestion.index] = isCorrect ? 'correct' : 'wrong';
      setStatuses(nextStatuses);
      await persistProgress(nextStatuses);

      const points = score.points;
      if (typeof points === 'number') {
        setSessionPoints((current) => current + points);
      }
      setAnswerResult({ isCorrect, points });
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không nộp được câu trả lời');
    } finally {
      setIsSubmitting(false);
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
      <div className="game-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="game-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="game-page">
        <DataLoading variant="message" message="Chưa có câu hỏi Grammar cho khóa học này" />
      </div>
    );
  }

  return (
    <GrammarGameContent
      courseId={course.id}
      course={course}
      questions={questions}
      statuses={statuses}
      panel={panel}
      currentIndex={currentIndex}
      input={input}
      answerResult={answerResult}
      submitMessage={submitMessage}
      sessionPoints={sessionPoints}
      isSubmitting={isSubmitting}
      completedCount={completedCount}
      progressPercent={progressPercent}
      stats={stats}
      onBackHome={() => {
        window.location.href = `/courses/${course.id}`;
      }}
      onBackToList={() => setPanel('list')}
      onOpenQuestion={openQuestion}
      onStartContinue={startOrContinue}
      onRetry={() => {
        void resetProgress(false);
      }}
      onRetryFromStart={() => {
        void resetProgress(true);
      }}
      onViewResult={() => setPanel('result')}
      isResetting={isResetting}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      onNext={goNext}
    />
  );
}
