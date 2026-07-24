'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { PageBackButton } from '@/components/PageBackButton';
import { GameResultSummary } from '@/components/games/GameScoreHero';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { clearAutoAdvance, scheduleAutoAdvance } from '@/features/games/autoAdvance';
import { gradedIsCorrect, isGradedStatus } from '@/features/games/gradedLock';
import {
  createPlaySessionId,
  persistGameProgress,
} from '@/features/games/persistProgress';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  normalizeStatuses,
} from '@/lib/gameCatalog';
import { parseSkillQuery, type SkillId } from '@/lib/skillCatalog';

import { gradeQuizFillAnswer, gradeQuizOptionAnswer } from './gradeAnswer';
import {
  QUIZ_TYPE_LABELS,
  buildQuizQuery,
  filterQuizQuestions,
  normalizeQuizExercise,
  parseQuizTypeQuery,
  quizExercisesForSkillType,
  quizTypesForSkill,
  type QuizType,
} from './quizNav';

type QuizQuestion = {
  id: string;
  index: number;
  type: string;
  typeLabel: string;
  skill: string;
  exercise: string;
  exerciseLabel?: string;
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
  playSessionId?: string | null;
  gameScore?: number;
  message?: string;
};

type AnswerResult = {
  isCorrect: boolean;
  points?: number;
};

type Props = {
  courseId: string;
};

type Panel = 'types' | 'exercises' | 'list' | 'question' | 'result';

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

function statsForQuestions(
  questions: QuizQuestion[],
  statuses: ProgressStatus[]
): QuizStats {
  let correct = 0;
  let wrong = 0;
  for (const question of questions) {
    const status = statuses[question.index] || 'empty';
    if (status === 'correct') correct += 1;
    else if (status === 'wrong') wrong += 1;
  }
  return {
    total: questions.length,
    correct,
    wrong,
    pending: Math.max(questions.length - correct - wrong, 0),
  };
}

function nextEmptyInSubset(
  questions: QuizQuestion[],
  statuses: ProgressStatus[]
): number {
  const idx = questions.findIndex((q) => (statuses[q.index] || 'empty') === 'empty');
  return idx;
}

export function QuizGame({ courseId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skill = parseSkillQuery(searchParams.get('skill'));
  const selectedType = parseQuizTypeQuery(searchParams.get('type'));
  const exerciseParam = searchParams.get('exercise');
  const selectedExercise =
    exerciseParam != null && exerciseParam !== ''
      ? normalizeQuizExercise(exerciseParam)
      : null;

  const [data, setData] = useState<QuizGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('types');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
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

        setData(json);
        setStatuses(nextStatuses);
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

  const allQuestions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;

  useEffect(() => {
    if (!courseId || isLoading) return;
    if (!skill) {
      router.replace(`/courses/${courseId}`);
    }
  }, [courseId, isLoading, router, skill]);

  const typeCards = useMemo(
    () => (skill ? quizTypesForSkill(allQuestions, skill) : []),
    [allQuestions, skill]
  );

  const exerciseCards = useMemo(() => {
    if (!skill || !selectedType) return [];
    return quizExercisesForSkillType(allQuestions, skill, selectedType);
  }, [allQuestions, selectedType, skill]);

  const filteredQuestions = useMemo(() => {
    if (!skill || !selectedType || !selectedExercise) return [];
    return filterQuizQuestions(allQuestions, skill, selectedType, selectedExercise);
  }, [allQuestions, selectedExercise, selectedType, skill]);

  const navStep: 'types' | 'exercises' | 'list' | null = !skill
    ? null
    : selectedType && selectedExercise
      ? 'list'
      : selectedType
        ? 'exercises'
        : 'types';

  useEffect(() => {
    if (panel === 'question' || panel === 'result') return;
    if (navStep === 'types' || navStep === 'exercises' || navStep === 'list') {
      setPanel(navStep);
    }
  }, [navStep, panel]);

  useEffect(() => {
    if (panel !== 'list' || filteredQuestions.length === 0) return;
    const firstEmpty = nextEmptyInSubset(filteredQuestions, statuses);
    setCurrentIndex(firstEmpty === -1 ? 0 : firstEmpty);
  }, [filteredQuestions, panel, statuses]);

  const playQuestions = filteredQuestions;
  const currentQuestion = playQuestions[currentIndex];
  const maxScore = playQuestions.length * 200;
  const stats = useMemo(
    () => statsForQuestions(playQuestions, statuses),
    [playQuestions, statuses]
  );
  const progressPercent = maxScore
    ? Math.min(100, Math.round((sessionPoints / maxScore) * 100))
    : 0;

  useEffect(() => {
    if (panel === 'question') {
      questionStartTime.current = Date.now();
      setInput('');
      setSelectedOption(null);
      setSubmitMessage('');
      clearAutoAdvance(advanceTimer);
      if (currentQuestion && isGradedStatus(statuses[currentQuestion.index])) {
        setAnswerResult({ isCorrect: gradedIsCorrect(statuses[currentQuestion.index]) });
      } else {
        setAnswerResult(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lock from status at navigation time
  }, [currentIndex, panel]);

  function setQuizQuery(next: {
    skill: SkillId;
    type?: QuizType | null;
    exercise?: string | null;
  }) {
    router.push(`/games/quiz/${courseId}${buildQuizQuery(next)}`);
  }

  async function persistProgress(
    nextStatuses: ProgressStatus[],
    reset = false,
    sessionId?: string | null
  ) {
    if (!course) return null;

    const json = await persistGameProgress({
      courseKey: progressCourseKey(course.name, course.levelName),
      game: 'quiz',
      statuses: nextStatuses,
      reset,
      playSessionId: sessionId === undefined ? playSessionId : sessionId,
    });
    if (!json.success) {
      throw new Error(json.message || 'Không lưu được tiến độ');
    }
    if (json.statuses) {
      setStatuses(normalizeStatuses(json.statuses, allQuestions.length));
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

  function goNext() {
    clearAutoAdvance(advanceTimer);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= playQuestions.length) {
      setPanel('result');
      return;
    }
    setCurrentIndex(nextIndex);
  }

  function scheduleAdvance() {
    scheduleAutoAdvance(advanceTimer, goNext);
  }

  async function submitAnswer(isCorrect: boolean, alreadyAnswered: boolean) {
    if (!course || !currentQuestion) return;
    if (isGradedStatus(statuses[currentQuestion.index]) || answerResult) return;

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      let points: number | undefined;

      if (!alreadyAnswered) {
        const sessionId = await ensurePlaySession();
        const elapsedMs = Date.now() - questionStartTime.current;
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'quiz',
          currentQuestion.index,
          isCorrect,
          elapsedMs,
          sessionId
        );
        if (!score.success) {
          throw new Error(score.message || 'Không ghi được điểm');
        }
        points = score.points;
        if (typeof points === 'number') {
          setSessionPoints((current) => current + points!);
        }
        if (typeof score.gameScore === 'number') {
          setGameScore(score.gameScore);
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

  function openQuestion(listIndex: number) {
    void (async () => {
      try {
        await ensurePlaySession();
        setCurrentIndex(listIndex);
        setPanel('question');
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : 'Không mở được câu hỏi');
      }
    })();
  }

  function startOrContinue() {
    const firstEmptyIndex = nextEmptyInSubset(playQuestions, statuses);
    if (firstEmptyIndex === -1) return;
    void (async () => {
      try {
        await ensurePlaySession();
        setCurrentIndex(firstEmptyIndex);
        setPanel('question');
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : 'Không bắt đầu được bài');
      }
    })();
  }

  async function resetProgress(openFirstQuestion: boolean) {
    if (!course || isResetting || playQuestions.length === 0) return;

    const nextStatuses = [...statuses];
    for (const question of playQuestions) {
      nextStatuses[question.index] = 'empty';
    }
    const nextSession = createPlaySessionId();

    setIsResetting(true);
    setSubmitMessage('');

    try {
      setStatuses(nextStatuses);
      setSessionPoints(0);
      setAnswerResult(null);
      setCurrentIndex(0);
      setPlaySessionId(nextSession);
      await persistProgress(nextStatuses, false, nextSession);
      setPanel(openFirstQuestion ? 'question' : 'list');
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không làm lại được bài');
    } finally {
      setIsResetting(false);
    }
  }

  function handleBack() {
    if (!skill || !course) return;
    if (panel === 'question') {
      setPanel('list');
      return;
    }
    if (panel === 'result') {
      setPanel('list');
      return;
    }
    if (panel === 'list' && selectedType) {
      setQuizQuery({ skill, type: selectedType });
      return;
    }
    if (panel === 'exercises') {
      setQuizQuery({ skill });
      return;
    }
    window.location.href = `/courses/${course.id}?skill=${skill}`;
  }

  const backTitle =
    panel === 'question' || panel === 'result'
      ? 'Về danh sách'
      : panel === 'list'
        ? 'Về bài tập'
        : panel === 'exercises'
          ? 'Về loại câu'
          : 'Quay lại khóa học';

  if (isLoading) {
    return (
      <div className="game-page quiz-page">
        <DataLoading />
      </div>
    );
  }

  if (!skill) {
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

  if (allQuestions.length === 0) {
    return (
      <div className="game-page quiz-page">
        <DataLoading variant="message" message="Chưa có câu hỏi Trắc nghiệm cho khóa học này" />
      </div>
    );
  }

  const firstPending = nextEmptyInSubset(playQuestions, statuses);
  const allAnswered = playQuestions.length > 0 && firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const typeLabel = selectedType ? QUIZ_TYPE_LABELS[selectedType] : '';
  const subtitle = [
    course.name,
    course.levelName,
    typeLabel,
    selectedExercise,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="game-page quiz-page">
      <PageBackButton title={backTitle} onClick={handleBack} />
      <div className="game-top">
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

      {panel === 'types' ? (
        <div className="game-card" id="typePanel">
          <div className="list-title">Chọn loại câu</div>
          {typeCards.length === 0 ? (
            <DataLoading
              variant="message"
              message="Chưa có câu hỏi Trắc nghiệm cho kỹ năng này"
            />
          ) : (
            <div className="activity-grid" style={{ marginTop: 12 }}>
              {typeCards.map((card) => (
                <button
                  key={card.type}
                  type="button"
                  className="activity-card"
                  data-quiz-type={card.type}
                  onClick={() => setQuizQuery({ skill, type: card.type })}
                >
                  <div className="activity-left">
                    <div className="activity-icon quiz">
                      <i className="fas fa-list-ul" aria-hidden="true" />
                    </div>
                    <span className="activity-label">{card.label}</span>
                  </div>
                  <span className="activity-progress">{card.count} câu</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {panel === 'exercises' && selectedType ? (
        <div className="game-card" id="exercisePanel">
          <div className="list-title">Chọn bài ({QUIZ_TYPE_LABELS[selectedType]})</div>
          {exerciseCards.length === 0 ? (
            <DataLoading variant="message" message="Chưa có bài tập cho loại câu này" />
          ) : (
            <div className="activity-grid" style={{ marginTop: 12 }}>
              {exerciseCards.map((card) => (
                <button
                  key={card.exercise}
                  type="button"
                  className="activity-card"
                  data-quiz-exercise={card.exercise}
                  onClick={() =>
                    setQuizQuery({ skill, type: selectedType, exercise: card.exercise })
                  }
                >
                  <div className="activity-left">
                    <div className="activity-icon quiz">
                      <i className="fas fa-folder-open" aria-hidden="true" />
                    </div>
                    <span className="activity-label">{card.exercise}</span>
                  </div>
                  <span className="activity-progress">{card.count} câu</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {panel === 'list' ? (
        <div className="game-card" id="listPanel">
          <div className="list-title">
            Danh sách câu hỏi
            {selectedExercise ? ` · ${selectedExercise}` : ''}
          </div>
          {playQuestions.length === 0 ? (
            <DataLoading variant="message" message="Không có câu hỏi trong bài này" />
          ) : (
            <>
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
                {playQuestions.map((question, listIndex) => {
                  const status = statuses[question.index] || 'empty';
                  return (
                    <div
                      key={question.id}
                      role="button"
                      tabIndex={0}
                      className={`q-list-item ${statusClass(status)}`}
                      onClick={() => openQuestion(listIndex)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openQuestion(listIndex);
                        }
                      }}
                    >
                      <span className="q-num">{listIndex + 1}</span>
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPanel('result')}
                  >
                    Xem kết quả
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}

      {panel === 'question' && currentQuestion ? (
        <div className="game-card" id="questionPanel">
          <span className="question-counter-pill">
            Câu {currentIndex + 1}/{playQuestions.length}
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
                        Chưa đúng. Đáp án:{' '}
                        <strong
                          dangerouslySetInnerHTML={{ __html: currentQuestion.answer }}
                        />
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
                      {currentIndex + 1 >= playQuestions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
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
                        <span dangerouslySetInnerHTML={{ __html: option }} />
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
                      {currentIndex + 1 >= playQuestions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
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
              {isResetting ? 'Đang làm lại...' : 'Làm lại'}
            </button>
            <Link
              href={`/courses/${course.id}?skill=${skill}`}
              className="btn btn-secondary"
            >
              Quay lại khóa học
            </Link>
          </GameResultSummary>
        </div>
      ) : null}
    </div>
  );
}
