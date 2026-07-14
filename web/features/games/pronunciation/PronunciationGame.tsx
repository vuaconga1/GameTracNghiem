'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  normalizeStatuses,
} from '@/lib/gameCatalog';

import { playReferenceAudio } from './audio';
import {
  getSentenceWordScores,
  getWordPhonemeBreakdown,
  phonemeScoreRings,
  pitchCurvePoints,
  resolveFeedbackMode,
  sentenceScoreRings,
  stressFeedbackText,
  stressSyllablesForDisplay,
} from './feedback';
import {
  findFirstQuestionByMode,
  nextQuestionIndexInMode,
  uniqueModes,
} from './findQuestion';
import {
  getModeWordCardStyle,
  modeConfig,
  modeLabel,
} from './modes';
import type {
  PronunciationGameResponse,
  PronunciationMode,
  PronunciationQuestion,
  RecordState,
} from './types';

type Props = {
  courseId: string;
};

type AnswerResult = {
  isCorrect: boolean;
  points?: number;
};

function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toLocaleString('vi-VN')} điểm`;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  return (
    <div className="eval-ring">
      <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="38" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>
          {value}
        </text>
      </svg>
      <span className="eval-ring-label">{label}</span>
    </div>
  );
}

function StressSyllables({ word, accentColor }: { word: string; accentColor: string }) {
  const syllables = stressSyllablesForDisplay(word);
  return (
    <div className="pron-stress-row">
      {syllables.map((syllable, index) => (
        <span key={`${syllable.text}-${index}`} style={{ display: 'contents' }}>
          <div className="pron-stress-col">
            <div
              className={`pron-stress-dot${syllable.stressed ? '' : ' muted'}`}
              style={
                syllable.stressed
                  ? {
                      background: accentColor,
                      boxShadow: `0 2px 10px ${accentColor}50`,
                    }
                  : undefined
              }
            />
            <span className={syllable.stressed ? 'pron-stress-strong' : 'pron-stress-weak'}>
              {syllable.stressed ? syllable.text.toUpperCase() : syllable.text.toLowerCase()}
            </span>
          </div>
          {index < syllables.length - 1 ? <span className="pron-stress-sep">·</span> : null}
        </span>
      ))}
    </div>
  );
}

function EvaluationResult({
  question,
  isCorrect,
  points,
}: {
  question: PronunciationQuestion;
  isCorrect: boolean;
  points?: number;
}) {
  const mode = resolveFeedbackMode(question.mode);
  const cfg = modeConfig(mode);

  if (mode === 'phoneme') {
    const rings = phonemeScoreRings(isCorrect, question.targetIpa);
    const chips = getWordPhonemeBreakdown(question.targetText, isCorrect);
    return (
      <div className="evaluation-result pron-content-stack">
        <div className="eval-rings">
          {rings.map((ring) => (
            <ScoreRing key={ring.label} {...ring} />
          ))}
        </div>
        <div className={`eval-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          <p className="eval-feedback-title">
            <i
              className={`fa-solid ${isCorrect ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500'}`}
              aria-hidden="true"
            />
            <span>
              {isCorrect
                ? 'Phát âm rất chuẩn! Hãy tiếp tục luyện tập.'
                : 'Chưa chuẩn — tập trung vào âm cần chú ý.'}
            </span>
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <p className="eval-word-breakdown-title" style={{ textAlign: 'left' }}>
              Phân tích từng âm
            </p>
            <div className="eval-chip-row">
              {chips.map((chip, index) => (
                <div key={`${chip.char}-${index}`} className={`eval-letter-chip${chip.weak ? ' weak' : ''}`}>
                  <span className={`eval-letter${chip.weak ? ' weak' : ''}`}>{chip.char}</span>
                  <span className={`eval-letter-score${chip.weak ? ' weak' : ''}`}>{chip.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {typeof points === 'number' ? <div className="eval-points">{formatPoints(points)}</div> : null}
      </div>
    );
  }

  if (mode === 'sentence') {
    const rings = sentenceScoreRings(isCorrect);
    const words = getSentenceWordScores(question.targetText, isCorrect);
    return (
      <div className="evaluation-result pron-content-stack">
        <div className="eval-rings">
          {rings.map((ring) => (
            <ScoreRing key={ring.label} {...ring} />
          ))}
        </div>
        <div className="eval-word-breakdown">
          <p className="eval-word-breakdown-title">Từng từ một</p>
          <div className="eval-word-row">
            {words.map((item) => {
              const colorClass =
                item.score >= 80 ? 'good' : item.score >= 60 ? 'mid' : 'bad';
              return (
                <div key={item.word} className="eval-word-chip">
                  <span className="eval-word-text">{item.word}</span>
                  <span className={`eval-word-score ${colorClass}`}>{item.score}</span>
                </div>
              );
            })}
          </div>
        </div>
        {typeof points === 'number' ? <div className="eval-points">{formatPoints(points)}</div> : null}
      </div>
    );
  }

  const feedback = stressFeedbackText(question.targetText, isCorrect);
  const strokeColor = isCorrect ? '#22c55e' : '#ef4444';
  return (
    <div className="evaluation-result pron-content-stack">
      <div className={`eval-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <i
            className={`fa-solid ${isCorrect ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500'}`}
            aria-hidden="true"
          />
          <div>
            <p className="eval-feedback-title" style={{ margin: 0 }}>
              {feedback.title}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.125rem' }}>{feedback.body}</p>
          </div>
        </div>
        <div className="eval-pitch-wrap">
          <svg viewBox="0 0 200 36" style={{ width: '100%', height: '1.75rem', color: `${strokeColor}80` }}>
            <polyline
              points={pitchCurvePoints(isCorrect)}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <span className="eval-pitch-label">giọng của bạn</span>
        </div>
      </div>
      {typeof points === 'number' ? <div className="eval-points">{formatPoints(points)}</div> : null}
      <span className="hidden-panel">{cfg.color}</span>
    </div>
  );
}

function WordCard({ question, mode }: { question: PronunciationQuestion; mode: PronunciationMode }) {
  const cfg = modeConfig(mode);
  const cardStyle = getModeWordCardStyle(mode);
  const prompt = question.prompt || 'Nghe và đọc lại mẫu bên dưới';

  return (
    <div className="pron-content-stack">
      <div className="text-center">
        <p className="pron-prompt-label" style={{ color: cfg.color }}>
          Nội dung luyện
        </p>
        <p className="pron-prompt-text">{prompt}</p>
      </div>

      {mode === 'phoneme' ? (
        <div className="pron-word-card" style={cardStyle}>
          <p className="pron-target-lg">{question.targetText}</p>
          {question.targetIpa ? (
            <p className="pron-ipa" style={{ color: cfg.color }}>
              {question.targetIpa}
            </p>
          ) : null}
          {question.hint ? <p className="pron-hint">{question.hint}</p> : null}
        </div>
      ) : null}

      {mode === 'sentence' ? (
        <div className="pron-word-card" style={cardStyle}>
          <p className="pron-target-xl">{question.targetText}</p>
          {question.hint ? <p className="pron-hint">{question.hint}</p> : null}
        </div>
      ) : null}

      {mode === 'stress' ? (
        <div className="pron-word-card" style={cardStyle}>
          <p className="pron-prompt-label" style={{ color: cfg.color }}>
            Nhìn điểm nhấn âm tiết
          </p>
          <StressSyllables word={question.targetText} accentColor={cfg.color} />
          <p className="pron-target-md">{question.targetText}</p>
          {question.targetIpa ? (
            <p className="pron-ipa" style={{ color: cfg.color }}>
              {question.targetIpa}
            </p>
          ) : null}
        </div>
      ) : null}

      {!['phoneme', 'sentence', 'stress'].includes(mode) ? (
        <div className="pron-word-card" style={cardStyle}>
          <p className="pron-target-xl">{question.targetText}</p>
        </div>
      ) : null}
    </div>
  );
}

export type PronunciationGameContentProps = {
  course: NonNullable<PronunciationGameResponse['course']>;
  questions: PronunciationQuestion[];
  statuses: ProgressStatus[];
  currentIndex: number;
  currentMode: PronunciationMode;
  recordState: RecordState;
  showSelfEval: boolean;
  showActions: boolean;
  sessionPoints: number;
  maxScore: number;
  progressPercent: number;
  answerResult: AnswerResult | null;
  submitMessage: string;
  isSubmitting: boolean;
  onBack: () => void;
  onModeChange: (mode: PronunciationMode) => void;
  onResetQuestion: () => void;
  onPlayReference: () => void;
  onPlaySlow: () => void;
  onMicClick: () => void;
  onSelfEval: (isCorrect: boolean) => void;
  onRetry: () => void;
  onNext: () => void;
};

export function PronunciationGameContent({
  course,
  questions,
  statuses,
  currentIndex,
  currentMode,
  recordState,
  showSelfEval,
  showActions,
  sessionPoints,
  maxScore,
  progressPercent,
  answerResult,
  submitMessage,
  isSubmitting,
  onBack,
  onModeChange,
  onResetQuestion,
  onPlayReference,
  onPlaySlow,
  onMicClick,
  onSelfEval,
  onRetry,
  onNext,
}: PronunciationGameContentProps) {
  const question = questions[currentIndex];
  const modes = uniqueModes(questions);
  const modeCfg = modeConfig(currentMode);
  const total = questions.length;
  const micColor =
    recordState === 'recording' ? '#ef4444' : modeCfg.color;

  if (!question) return null;

  return (
    <div className="pronunciation-page pron-page-stack">
      <button type="button" className="pron-back-btn" onClick={onBack}>
        <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Quay lại
      </button>

      <div className="pron-page-header">
        <div className="pron-hero">
          <p className="pron-hero-label">Khóa học hiện tại</p>
          <h1 className="pron-hero-title">{course.name}</h1>
        </div>

        <div className="game-meta pron-game-meta">
          <span className="meta-pill meta-score-pill">
            {sessionPoints.toLocaleString('vi-VN')}/{maxScore.toLocaleString('vi-VN')} điểm
          </span>
          <div className="progress-bar-wrap" aria-label={`Điểm phiên ${sessionPoints}/${maxScore}`}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="pron-main-shell pron-main-card">
        <span className="question-counter-pill" style={{ top: 12, right: 12 }}>
          Câu {currentIndex + 1}/{total}
        </span>
        <div className="pron-card-stripe" style={{ background: modeCfg.color }} />

        <div className="pron-main-inner pron-main-stack">
          <div className="pron-mode-toolbar">
            <div className="pron-mode-tabs" id="modeTabs">
              {modes.map((mode) => {
                const cfg = modeConfig(mode);
                const tabQuestion = questions.find((item) => item.mode === mode);
                const label = modeLabel(mode, tabQuestion?.modeLabel);
                const isActive = mode === currentMode;
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`mode-btn${isActive ? ' active' : ''}`}
                    data-mode={mode}
                    style={
                      isActive
                        ? {
                            background: cfg.color,
                            borderColor: cfg.color,
                            boxShadow: `0 4px 20px ${cfg.color}40`,
                          }
                        : undefined
                    }
                    onClick={() => onModeChange(mode)}
                  >
                    <i className={`${cfg.icon} w-4 h-4 shrink-0`} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="pron-reset-btn"
              title="Làm lại"
              onClick={onResetQuestion}
            >
              <i className="fa-solid fa-rotate-left" aria-hidden="true" />
            </button>
          </div>

          <div className="pron-game-content" id="gameContent">
            <div className="pron-content-stack">
              <WordCard question={question} mode={currentMode} />

              <div className="pron-audio-grid">
                <button
                  id="btnAudioRef"
                  type="button"
                  className="pron-btn-audio pron-btn-audio-primary"
                  onClick={onPlayReference}
                >
                  Nghe mẫu
                </button>
                <button
                  id="btnAudioSlow"
                  type="button"
                  className="pron-btn-audio pron-btn-audio-secondary"
                  onClick={onPlaySlow}
                >
                  Nghe chậm
                </button>
              </div>

              <div className="pron-mic-panel">
                <div className="pron-mic-center">
                  <button
                    id="btnMicIcon"
                    type="button"
                    className="pron-mic-btn"
                    style={{
                      background: micColor,
                      boxShadow:
                        recordState === 'recording'
                          ? '0 0 0 0px #ef444440, 0 8px 32px #ef444460'
                          : `0 0 0 0px ${modeCfg.color}30, 0 8px 32px ${modeCfg.color}50`,
                    }}
                    onClick={onMicClick}
                    disabled={recordState === 'recording' || isSubmitting}
                  >
                    {recordState === 'recording' ? (
                      <>
                        <span className="pron-mic-ping" aria-hidden="true" />
                        <span className="pron-mic-ping inner" aria-hidden="true" />
                      </>
                    ) : null}
                    <i className="fa-solid fa-microphone" style={{ position: 'relative', zIndex: 1 }} aria-hidden="true" />
                  </button>
                </div>
                <p id="micStatusText" className="pron-mic-status">
                  {recordState === 'recording'
                    ? 'Đang ghi âm — đọc to và rõ…'
                    : recordState === 'done' && (statuses[currentIndex] !== 'empty' || showSelfEval)
                      ? showSelfEval
                        ? 'Đã ghi xong. Chọn kết quả tự đánh giá bên dưới:'
                        : 'Đã hoàn thành câu này'
                      : 'Nhấn micro để bắt đầu ghi âm'}
                </p>
              </div>

              {showSelfEval ? (
                <div id="selfEvalPanel" className="self-eval">
                  <button
                    type="button"
                    className="self-eval-correct"
                    disabled={isSubmitting}
                    onClick={() => onSelfEval(true)}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    className="self-eval-wrong"
                    disabled={isSubmitting}
                    onClick={() => onSelfEval(false)}
                  >
                    Sai
                  </button>
                </div>
              ) : null}

              {answerResult ? (
                <EvaluationResult
                  question={question}
                  isCorrect={answerResult.isCorrect}
                  points={answerResult.points}
                />
              ) : statuses[currentIndex] !== 'empty' && recordState === 'done' ? (
                <EvaluationResult
                  question={question}
                  isCorrect={statuses[currentIndex] === 'correct'}
                />
              ) : null}

              {submitMessage ? (
                <div className="data-loading-state">{submitMessage}</div>
              ) : null}
            </div>
          </div>

          {showActions ? (
            <div id="actionContainer" className="pron-action-row">
              <button id="btnRetry" type="button" className="pron-btn-retry" onClick={onRetry}>
                <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Thử lại
              </button>
              <button id="btnNextAction" type="button" className="pron-btn-next" onClick={onNext}>
                Tiếp theo <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PronunciationGame({ courseId }: Props) {
  const [data, setData] = useState<PronunciationGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<PronunciationMode>('phoneme');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [showSelfEval, setShowSelfEval] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const questionStartTime = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGame() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/games/pronunciation/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as PronunciationGameResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không tải được trò chơi');
        }

        const questions = json.questions || [];
        const nextStatuses = normalizeStatuses(json.statuses, questions.length);
        const firstMode = questions[0]?.mode || 'phoneme';

        setData(json);
        setStatuses(nextStatuses);
        setCurrentMode(firstMode);
        setCurrentIndex(findFirstQuestionByMode(questions, firstMode));
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
      if (recordTimer.current) clearTimeout(recordTimer.current);
      if (activeAudio.current) {
        activeAudio.current.pause();
        activeAudio.current = null;
      }
    };
  }, [courseId]);

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;
  const maxScore = questions.length * 200;
  const progressPercent = maxScore ? Math.min(100, Math.round((sessionPoints / maxScore) * 100)) : 0;

  const resetQuestionState = useCallback(
    (index: number, mode: PronunciationMode) => {
      questionStartTime.current = Date.now();
      setRecordState('idle');
      setShowSelfEval(false);
      setShowActions(false);
      setAnswerResult(null);
      setSubmitMessage('');

      const prevStatus = statuses[index];
      if (prevStatus === 'correct' || prevStatus === 'wrong') {
        setRecordState('done');
        setShowActions(true);
      }

      setCurrentIndex(index);
      setCurrentMode(mode);
      if (recordTimer.current) {
        clearTimeout(recordTimer.current);
        recordTimer.current = null;
      }
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    },
    [statuses]
  );

  useEffect(() => {
    if (!questions.length) return;
    const question = questions[currentIndex];
    if (!question) return;
    questionStartTime.current = Date.now();
    setRecordState('idle');
    setShowSelfEval(false);
    setAnswerResult(null);
    setSubmitMessage('');

    const prevStatus = statuses[currentIndex];
    if (prevStatus === 'correct' || prevStatus === 'wrong') {
      setRecordState('done');
      setShowActions(true);
    } else {
      setShowActions(false);
    }
  }, [currentIndex, questions, statuses]);

  async function persistProgress(nextStatuses: ProgressStatus[], reset = false) {
    if (!course) return;

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseKey: progressCourseKey(course.name, course.levelName),
        game: 'pronunciation',
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

  function scheduleAdvance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      goNext();
    }, 900);
  }

  function goNext() {
    if (!questions.length) return;
    const nextIndex = nextQuestionIndexInMode(questions, currentIndex, currentMode);
    resetQuestionState(nextIndex, questions[nextIndex]?.mode || currentMode);
  }

  function handleModeChange(mode: PronunciationMode) {
    const nextIndex = findFirstQuestionByMode(questions, mode);
    resetQuestionState(nextIndex, mode);
  }

  function handleMicClick() {
    if (recordState === 'recording' || isSubmitting) return;

    setShowSelfEval(false);
    setShowActions(false);
    setAnswerResult(null);
    setRecordState('recording');

    if (recordTimer.current) clearTimeout(recordTimer.current);
    recordTimer.current = setTimeout(() => {
      setRecordState('done');
      setShowSelfEval(true);
    }, 2000);
  }

  function handlePlay(rate: number) {
    const question = questions[currentIndex];
    if (!question) return;
    playReferenceAudio(
      question.targetText,
      question.referenceAudioUrl || undefined,
      rate,
      activeAudio.current,
      (audio) => {
        activeAudio.current = audio;
      }
    );
  }

  async function handleSelfEval(isCorrect: boolean) {
    if (!course || !questions[currentIndex] || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitMessage('');
    setShowSelfEval(false);

    try {
      const alreadyAnswered = statuses[currentIndex] !== 'empty';
      let points: number | undefined;

      if (!alreadyAnswered) {
        const elapsedMs = Date.now() - questionStartTime.current;
        const score = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'pronunciation',
          currentIndex,
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
      nextStatuses[currentIndex] = isCorrect ? 'correct' : 'wrong';
      setStatuses(nextStatuses);
      await persistProgress(nextStatuses);

      setAnswerResult({ isCorrect, points });
      setShowActions(true);
      scheduleAdvance();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không nộp được câu trả lời');
      setShowSelfEval(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="pronunciation-page">
        <DataLoading />
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="pronunciation-page">
        <DataLoading variant="message" message={errorMessage || 'Không tìm thấy trò chơi'} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="pronunciation-page">
        <DataLoading variant="message" message="Chưa có câu hỏi Phát âm cho khóa học này" />
      </div>
    );
  }

  return (
    <PronunciationGameContent
      course={course}
      questions={questions}
      statuses={statuses}
      currentIndex={currentIndex}
      currentMode={currentMode}
      recordState={recordState}
      showSelfEval={showSelfEval}
      showActions={showActions}
      sessionPoints={sessionPoints}
      maxScore={maxScore}
      progressPercent={progressPercent}
      answerResult={answerResult}
      submitMessage={submitMessage}
      isSubmitting={isSubmitting}
      onBack={() => {
        window.location.href = `/courses/${course.id}`;
      }}
      onModeChange={handleModeChange}
      onResetQuestion={() => resetQuestionState(currentIndex, currentMode)}
      onPlayReference={() => handlePlay(1.0)}
      onPlaySlow={() => handlePlay(0.7)}
      onMicClick={handleMicClick}
      onSelfEval={(isCorrect) => void handleSelfEval(isCorrect)}
      onRetry={() => resetQuestionState(currentIndex, currentMode)}
      onNext={goNext}
    />
  );
}
