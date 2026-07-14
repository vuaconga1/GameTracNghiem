'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  normalizeStatuses,
} from '@/lib/gameCatalog';

import { gradeWordMatchPair } from './gradeAnswer';

type WordMatchQuestion = {
  id: string;
  index: number;
  word: string;
  image: string;
  hint: string;
};

type WordMatchGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  questions?: WordMatchQuestion[];
  statuses?: ProgressStatus[];
  message?: string;
};

type FeedbackState = {
  isCorrect: boolean;
  message: string;
  points?: number;
};

type Props = {
  courseId: string;
};

type Panel = 'board' | 'result';

function shuffleArray<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toLocaleString('vi-VN')} điểm`;
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

export function WordMatchGame({ courseId }: Props) {
  const [data, setData] = useState<WordMatchGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('board');
  const [wordOrder, setWordOrder] = useState<number[]>([]);
  const [imageOrder, setImageOrder] = useState<number[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState(-1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [hintText, setHintText] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [wrongPair, setWrongPair] = useState<{ wordIndex: number; imageIndex: number } | null>(null);
  const questionStartTime = useRef(Date.now());

  const rebuildOrders = useCallback((count: number) => {
    const indexes = Array.from({ length: count }, (_, index) => index);
    setWordOrder(shuffleArray(indexes));
    setImageOrder(shuffleArray(indexes));
  }, []);

  useEffect(() => {
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
          throw new Error(json.message || 'Không tải được trò chơi');
        }

        const questions = json.questions || [];
        const nextStatuses = normalizeStatuses(json.statuses, questions.length);
        const allDone =
          questions.length > 0 && doneCount(nextStatuses) === questions.length;

        setData(json);
        setStatuses(nextStatuses);
        setPanel(allDone ? 'result' : 'board');
        setSessionPoints(0);
        rebuildOrders(questions.length);
        questionStartTime.current = Date.now();
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
  }, [courseId, rebuildOrders]);

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;
  const maxScore = questions.length * 200;
  const correctCount = doneCount(statuses);
  const progressPercent = maxScore ? Math.min(100, Math.round((sessionPoints / maxScore) * 100)) : 0;

  const clearSelection = useCallback(() => {
    setSelectedWordIndex(-1);
    setSelectedImageIndex(-1);
    setHintText('');
  }, []);

  async function persistProgress(nextStatuses: ProgressStatus[], reset = false) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'word_match',
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
        const elapsedMs = Date.now() - questionStartTime.current;
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'word_match',
          wordIndex,
          isCorrect,
          elapsedMs
        );
        if (!score.success) {
          throw new Error(score.message || 'Không ghi được điểm');
        }

        let points: number | undefined;
        if (typeof score.points === 'number') {
          points = score.points;
          setSessionPoints((current) => current + points!);
        }

        if (isCorrect) {
          const question = questions[wordIndex];
          const nextStatuses = [...statuses];
          nextStatuses[wordIndex] = 'correct';
          setStatuses(nextStatuses);
          await persistProgress(nextStatuses);
          setFeedback({
            isCorrect: true,
            message: question?.hint ? question.hint : '',
            points,
          });
          maybeFinish(nextStatuses);
          clearSelection();
          setIsSubmitting(false);
        } else {
          setFeedback({
            isCorrect: false,
            message: 'Chưa khớp. Thử cặp khác nhé.',
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
        setSubmitMessage(err instanceof Error ? err.message : 'Không nộp được câu trả lời');
        clearSelection();
        setIsSubmitting(false);
      }
    },
    [
      clearSelection,
      course,
      isSubmitting,
      maybeFinish,
      questions,
      statuses,
      wrongPair,
    ]
  );

  function handleWordClick(index: number) {
    if (statuses[index] === 'correct' || isSubmitting || wrongPair) return;

    const question = questions[index];
    setSelectedWordIndex(index);
    setHintText(question?.hint || '');
    setFeedback(null);
    setSubmitMessage('');

    if (selectedImageIndex >= 0) {
      void checkMatch(index, selectedImageIndex);
    }
  }

  function handleImageClick(index: number) {
    if (statuses[index] === 'correct' || isSubmitting || wrongPair) return;

    setSelectedImageIndex(index);
    setFeedback(null);
    setSubmitMessage('');

    if (selectedWordIndex >= 0) {
      void checkMatch(selectedWordIndex, index);
    }
  }

  function handleManualCheck() {
    if (selectedWordIndex < 0 || selectedImageIndex < 0) {
      setFeedback({
        isCorrect: false,
        message: 'Hãy chọn một từ và một hình trước khi kiểm tra.',
      });
      return;
    }
    void checkMatch(selectedWordIndex, selectedImageIndex);
  }

  async function resetGame() {
    if (!course || isResetting) return;

    const emptyStatuses = Array.from({ length: questions.length }, () => 'empty' as ProgressStatus);

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
      await persistProgress(emptyStatuses, true);
      setPanel('board');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không làm lại được bài');
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
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="game-page wm-page">
        <DataLoading
          variant="message"
          message="Chưa có dữ liệu game nối từ với hình cho khóa học này"
        />
      </div>
    );
  }

  const subtitle = `${course.name}${course.levelName ? ` · ${course.levelName}` : ''}`;

  return (
    <div className="game-page wm-page">
      <div className="game-top">
        <button
          type="button"
          className="game-back"
          title="Quay lại khóa học"
          aria-label="Quay lại khóa học"
          onClick={() => {
            window.location.href = `/courses/${course.id}`;
          }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </button>
        <div className="game-title-wrap">
          <h1>Nối từ với hình ảnh</h1>
          <p className="game-subtitle">{subtitle}</p>
        </div>
      </div>

      {panel === 'board' ? (
        <>
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

          <div className="game-card" id="playPanel">
            <span className="question-counter-pill">
              Cặp {correctCount}/{questions.length}
            </span>
            <div className="question-label">Nối đúng từ tiếng Anh với hình tương ứng</div>
            <div className="wm-hint">{hintText}</div>
            <div className="wm-board">
              <div>
                <div className="wm-col-title">
                  <i className="fas fa-font" aria-hidden="true" /> Từ vựng
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
                  <i className="fas fa-image" aria-hidden="true" /> Hình ảnh
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
              Đúng {correctCount}/{questions.length} cặp
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
                    Đúng rồi!{' '}
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
                {isSubmitting ? 'Đang kiểm tra...' : 'Kiểm tra đáp án'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearSelection}>
                Bỏ chọn
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void resetGame()}
                disabled={isResetting}
              >
                {isResetting ? 'Đang làm lại...' : 'Làm lại'}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {panel === 'result' ? (
        <div className="game-card" id="resultPanel">
          <div className="result-panel">
            <h2>Hoàn thành!</h2>
            <p>
              Bạn đã nối đúng {correctCount}/{questions.length} cặp.
              {sessionPoints ? ` Tổng điểm phiên: ${formatPoints(sessionPoints)}.` : ''}
            </p>
            <div className="game-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void resetGame()}
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
