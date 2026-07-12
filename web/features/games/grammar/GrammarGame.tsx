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

function normalizeStatuses(statuses: ProgressStatus[] | undefined, questionCount: number): ProgressStatus[] {
  return Array.from({ length: questionCount }, (_, index) => statuses?.[index] || 'empty');
}

function nextEmptyIndex(statuses: ProgressStatus[]): number {
  return statuses.findIndex((status) => status === 'empty');
}

export function GrammarGame({ courseId }: Props) {
  const [data, setData] = useState<GrammarGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        setCurrentIndex(firstEmptyIndex === -1 ? questions.length : firstEmptyIndex);
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
  const isFinished = questions.length > 0 && currentIndex >= questions.length;
  const completedCount = statuses.filter((status) => status !== 'empty').length;

  useEffect(() => {
    questionStartTime.current = Date.now();
    setInput('');
    setAnswerResult(null);
    setSubmitMessage('');
  }, [currentIndex, questions.length]);

  async function persistProgress(nextStatuses: ProgressStatus[]) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'grammar',
        statuses: nextStatuses,
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
      setCurrentIndex(questions.length);
      return;
    }
    setCurrentIndex(nextIndex);
  }

  if (isLoading) {
    return <DataLoading />;
  }

  if (errorMessage || !course) {
    return <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />;
  }

  if (questions.length === 0) {
    return <DataLoading variant="message" message="Chưa có câu hỏi Grammar cho khóa học này" />;
  }

  return (
    <section className="space-y-6">
      <Link
        href={`/courses/${course.id}`}
        className="inline-flex rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary)] transition hover:bg-[var(--primary-hover)]"
      >
        Quay lại khóa học
      </Link>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[0_20px_60px_rgba(13,43,110,0.08)] sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-gold)]">
          Grammar · {course.levelName}
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--primary)] sm:text-5xl">
          {course.name}
        </h1>
        <p className="mt-4 font-bold text-[var(--text-muted)]">
          Đã làm {completedCount}/{questions.length} câu · điểm phiên {sessionPoints}
        </p>
      </div>

      {isFinished ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-8 text-center shadow-[0_20px_60px_rgba(13,43,110,0.08)]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-gold)]">
            Hoàn thành
          </p>
          <h2 className="mt-3 text-3xl font-black text-[var(--primary)]">Tổng kết Grammar</h2>
          <p className="mt-4 text-lg font-bold text-[var(--text-muted)]">
            Bạn đã hoàn thành {completedCount}/{questions.length} câu. Điểm phiên: {sessionPoints}
          </p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[0_20px_60px_rgba(13,43,110,0.08)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-black text-[var(--primary)]">
              Câu {currentIndex + 1}/{questions.length}
            </p>
            <p className="rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary)]">
              {statuses[currentIndex] === 'empty' ? 'Chưa làm' : 'Đã làm'}
            </p>
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-[var(--primary-light)] p-6 text-center text-2xl font-black text-[var(--primary)] sm:text-4xl">
            {currentQuestion.prefix} <span className="text-[var(--accent-gold)]">____</span>{' '}
            {currentQuestion.suffix}
          </div>

          {currentQuestion.hint ? (
            <p className="mt-4 text-center font-bold text-[var(--text-muted)]">
              Gợi ý: {currentQuestion.hint}
            </p>
          ) : null}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                Câu trả lời
              </span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isSubmitting || Boolean(answerResult)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--white)] px-5 py-4 text-lg font-bold outline-none transition focus:border-[var(--primary)]"
                placeholder="Nhập đáp án..."
              />
            </label>

            {submitMessage ? (
              <DataLoading variant="message" message={submitMessage} />
            ) : null}

            {answerResult ? (
              <div className="rounded-2xl border border-[var(--border)] p-5 text-center font-black">
                <p className={answerResult.isCorrect ? 'text-green-700' : 'text-red-700'}>
                  {answerResult.isCorrect ? 'Chính xác!' : 'Chưa đúng.'}
                </p>
                {typeof answerResult.points === 'number' ? (
                  <p className="mt-2 text-[var(--text-muted)]">
                    Điểm câu này: {answerResult.points}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {!answerResult ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-[var(--primary)] px-6 py-3 font-black text-[var(--white)] transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
                >
                  {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full bg-[var(--primary)] px-6 py-3 font-black text-[var(--white)] transition hover:bg-[var(--primary-dark)]"
                >
                  {currentIndex + 1 >= questions.length ? 'Xem tổng kết' : 'Câu tiếp theo'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
