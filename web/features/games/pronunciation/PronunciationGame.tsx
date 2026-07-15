'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { GameResultSummary, GameScoreHero } from '@/components/games/GameScoreHero';
import { submitAnswerScore } from '@/features/scoring/submitScore';
import { clearAutoAdvance, scheduleAutoAdvance } from '@/features/games/autoAdvance';
import { isGradedStatus } from '@/features/games/gradedLock';
import {
  createPlaySessionId,
  persistGameProgress,
} from '@/features/games/persistProgress';
import { progressCourseKey } from '@/lib/courseKey';
import {
  type ProgressStatus,
  normalizeStatuses,
} from '@/lib/gameCatalog';

import { playReferenceAudio } from './audio';
import {
  feedbackMessage,
  resolveFeedbackMode,
  sentenceScoreRingsFromResult,
  stressSyllablesForDisplay,
  wordScoreRings,
} from './feedback';
import {
  findFirstQuestionByMode,
  nextEmptyPlayableIndex,
  nextPlayableIndex,
  playableModes,
  playableQuestionEntries,
} from './findQuestion';
import {
  getModeWordCardStyle,
  modeConfig,
  modeLabel,
} from './modes';
import { startMicRecording, type RecordedClip } from './recordAudio';
import { scoreTranscript, type TranscriptScoreResult } from './scoreTranscript';
import type {
  PronunciationGameResponse,
  PronunciationMode,
  PronunciationQuestion,
  RecordState,
} from './types';
import { isWebSpeechAvailable, recognizeWithWebSpeech } from './webSpeechFallback';

type Props = {
  courseId: string;
};

type Panel = 'list' | 'question' | 'result';

type PronunciationStats = {
  total: number;
  correct: number;
  wrong: number;
  pending: number;
};

type AnswerResult = {
  isCorrect: boolean;
  points?: number;
  score: TranscriptScoreResult;
  engine: 'groq' | 'webspeech';
};

type MicSession = {
  stop: () => void;
  cancel: () => void;
  done: Promise<RecordedClip>;
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

function questionPreview(question: PronunciationQuestion): string {
  const label = modeLabel(question.mode || 'phoneme', question.modeLabel);
  const text = question.targetText || question.prompt || '';
  const preview = `[${label}] ${text}`.trim();
  return preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
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
  result,
}: {
  question: PronunciationQuestion;
  result: AnswerResult;
}) {
  const mode = resolveFeedbackMode(question.mode);
  const { score, points, engine } = result;

  if (mode === 'sentence') {
    const rings = sentenceScoreRingsFromResult(score);
    const words = score.wordScores || [];
    return (
      <div className="evaluation-result pron-content-stack">
        <div className="eval-rings">
          {rings.map((ring) => (
            <ScoreRing key={ring.label} {...ring} />
          ))}
        </div>
        {engine === 'webspeech' ? (
          <p className="pron-engine-badge">Chấm bằng nhận dạng trình duyệt</p>
        ) : null}
        <div className={`eval-feedback ${score.isCorrect ? 'correct' : 'wrong'}`}>
          <p className="eval-feedback-title">
            <i
              className={`fa-solid ${score.isCorrect ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500'}`}
              aria-hidden="true"
            />
            <span>{feedbackMessage(score)}</span>
          </p>
        </div>
        <div className="eval-word-breakdown">
          <p className="eval-word-breakdown-title">Từng từ một</p>
          <div className="eval-word-row">
            {words.map((item) => {
              const colorClass = item.score >= 80 ? 'good' : item.score >= 60 ? 'mid' : 'bad';
              return (
                <div key={`${item.word}-${item.score}`} className="eval-word-chip">
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

  const rings = wordScoreRings(score);
  return (
    <div className="evaluation-result pron-content-stack">
      <div className="eval-rings">
        {rings.map((ring) => (
          <ScoreRing key={ring.label} {...ring} />
        ))}
      </div>
      {engine === 'webspeech' ? (
        <p className="pron-engine-badge">Chấm bằng nhận dạng trình duyệt</p>
      ) : null}
      <div className={`eval-feedback ${score.isCorrect ? 'correct' : 'wrong'}`}>
        <p className="eval-feedback-title">
          <i
            className={`fa-solid ${score.isCorrect ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500'}`}
            aria-hidden="true"
          />
          <span>{feedbackMessage(score)}</span>
        </p>
      </div>
      {typeof points === 'number' ? <div className="eval-points">{formatPoints(points)}</div> : null}
    </div>
  );
}

function WordCard({ question, mode }: { question: PronunciationQuestion; mode: PronunciationMode }) {
  const cfg = modeConfig(mode);
  const cardStyle = getModeWordCardStyle(mode);
  const prompt = question.prompt || 'Nghe và đọc lại mẫu bên dưới';
  const isWord = mode === 'phoneme' || mode === 'word';

  return (
    <div className="pron-content-stack">
      <div className="text-center">
        <p className="pron-prompt-label" style={{ color: cfg.color }}>
          Nội dung luyện
        </p>
        <p className="pron-prompt-text">{prompt}</p>
      </div>

      {isWord ? (
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
        </div>
      ) : null}

      {!['phoneme', 'word', 'sentence', 'stress'].includes(String(mode)) ? (
        <div className="pron-word-card" style={cardStyle}>
          <p className="pron-target-xl">{question.targetText}</p>
        </div>
      ) : null}
    </div>
  );
}

function micStatusText(
  recordState: RecordState,
  hasAnswer: boolean,
  alreadyDone: boolean
): string {
  if (recordState === 'recording') return 'Đang ghi — nhấn lại để dừng';
  if (recordState === 'assessing') return 'đang tải dữ liệu';
  if (recordState === 'done' && (hasAnswer || alreadyDone)) return 'Đã hoàn thành câu này';
  return 'Nhấn micro để bắt đầu ghi âm';
}

export type PronunciationGameContentProps = {
  course: NonNullable<PronunciationGameResponse['course']>;
  questions: PronunciationQuestion[];
  statuses: ProgressStatus[];
  panel: Panel;
  currentIndex: number;
  currentMode: PronunciationMode;
  recordState: RecordState;
  showActions: boolean;
  sessionPoints: number;
  maxScore: number;
  progressPercent: number;
  answerResult: AnswerResult | null;
  submitMessage: string;
  isSubmitting: boolean;
  isResetting: boolean;
  stats: PronunciationStats;
  gameScore: number;
  onBackHome: () => void;
  onBackToList: () => void;
  onOpenQuestion: (index: number) => void;
  onStartContinue: () => void;
  onRetry: () => void;
  onRetryFromStart: () => void;
  onViewResult: () => void;
  onModeChange: (mode: PronunciationMode) => void;
  onResetQuestion: () => void;
  onPlayReference: () => void;
  onPlaySlow: () => void;
  onMicClick: () => void;
  onNext: () => void;
};

export function PronunciationGameContent({
  course,
  questions,
  statuses,
  panel,
  currentIndex,
  currentMode,
  recordState,
  showActions,
  sessionPoints,
  maxScore,
  progressPercent,
  answerResult,
  submitMessage,
  isSubmitting,
  isResetting,
  stats,
  gameScore,
  onBackHome,
  onBackToList,
  onOpenQuestion,
  onStartContinue,
  onRetry,
  onRetryFromStart,
  onViewResult,
  onModeChange,
  onResetQuestion,
  onPlayReference,
  onPlaySlow,
  onMicClick,
  onNext,
}: PronunciationGameContentProps) {
  const question = questions[currentIndex];
  const modes = playableModes(questions);
  const modeCfg = modeConfig(currentMode);
  const locked = isGradedStatus(statuses[currentIndex]) || Boolean(answerResult);
  const playableEntries = playableQuestionEntries(questions);
  const counterTotal = playableEntries.length || questions.length;
  const displayOrdinal =
    playableEntries.findIndex(({ index }) => index === currentIndex) + 1 || currentIndex + 1;
  const firstPending = nextEmptyPlayableIndex(questions, statuses);
  const allAnswered = firstPending === -1;
  const startLabel = allAnswered ? 'Làm lại từ đầu' : 'Bắt đầu làm bài';
  const micColor = recordState === 'recording' ? '#ef4444' : modeCfg.color;

  return (
    <div className="pronunciation-page pron-page-stack">
      <button
        type="button"
        className="pron-back-btn"
        onClick={panel === 'question' ? onBackToList : onBackHome}
      >
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />{' '}
        {panel === 'question' ? 'Về danh sách' : 'Quay lại'}
      </button>

      <div className="pron-page-header">
        <div className="pron-hero">
          <p className="pron-hero-label">Khóa học hiện tại</p>
          <h1 className="pron-hero-title">{course.name}</h1>
        </div>

        {panel === 'question' ? (
          <div className="game-meta pron-game-meta">
            <span className="meta-pill meta-score-pill">
              {sessionPoints.toLocaleString('vi-VN')}/{maxScore.toLocaleString('vi-VN')} điểm
            </span>
            <div className="progress-bar-wrap" aria-label={`Điểm phiên ${sessionPoints}/${maxScore}`}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {panel === 'list' ? (
        <div className="game-card" id="listPanel">
          <div className="list-title">Danh sách câu hỏi</div>
          <GameScoreHero gameScore={gameScore} />
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
            {playableEntries.map(({ question: item, index }, ordinal) => {
              const status = statuses[index] || 'empty';
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`q-list-item ${statusClass(status)}`}
                  onClick={() => onOpenQuestion(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenQuestion(index);
                    }
                  }}
                >
                  <span className="q-num">{ordinal + 1}</span>
                  <span className="q-preview">{questionPreview(item)}</span>
                  <span className="q-status">{statusIcon(status)}</span>
                </div>
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

      {panel === 'question' && question ? (
        <div className="pron-main-shell pron-main-card">
          <span className="question-counter-pill" style={{ top: 12, right: 12 }}>
            Câu {displayOrdinal}/{counterTotal}
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
                      {label === 'Luyện âm' ? 'Luyện từ' : label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="pron-reset-btn"
                title="Làm lại"
                onClick={onResetQuestion}
                disabled={locked}
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
                      disabled={locked || recordState === 'assessing' || isSubmitting}
                    >
                      {recordState === 'recording' ? (
                        <>
                          <span className="pron-mic-ping" aria-hidden="true" />
                          <span className="pron-mic-ping inner" aria-hidden="true" />
                        </>
                      ) : null}
                      <i
                        className="fa-solid fa-microphone"
                        style={{ position: 'relative', zIndex: 1 }}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  {recordState === 'assessing' ? (
                    <div className="data-loading-state">
                      <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
                    </div>
                  ) : (
                    <p id="micStatusText" className="pron-mic-status">
                      {micStatusText(
                        recordState,
                        Boolean(answerResult),
                        statuses[currentIndex] !== 'empty'
                      )}
                    </p>
                  )}
                </div>

                {answerResult ? (
                  <EvaluationResult question={question} result={answerResult} />
                ) : null}

                {submitMessage ? (
                  <div className="data-loading-state">{submitMessage}</div>
                ) : null}
              </div>
            </div>

            {showActions ? (
              <div id="actionContainer" className="pron-action-row">
                <button id="btnNextAction" type="button" className="pron-btn-next" onClick={onNext}>
                  {nextPlayableIndex(questions, currentIndex) === -1
                    ? 'Xem kết quả'
                    : 'Tiếp theo'}{' '}
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </div>
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
              onClick={onRetry}
              disabled={isResetting}
            >
              {isResetting ? 'Đang làm lại...' : 'Làm lại'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onBackHome}>
              Quay lại khóa học
            </button>
          </GameResultSummary>
        </div>
      ) : null}
    </div>
  );
}

async function assessClip(
  clip: RecordedClip,
  question: PronunciationQuestion,
  onFallback?: () => void
): Promise<{ transcript: string; engine: 'groq' | 'webspeech' }> {
  const form = new FormData();
  form.append('audio', clip.blob, `recording.${clip.mimeType.includes('mp4') ? 'mp4' : 'webm'}`);
  form.append('targetText', question.targetText);
  form.append('mode', String(question.mode || 'phoneme'));

  const res = await fetch('/api/games/pronunciation/assess', {
    method: 'POST',
    body: form,
  });
  const json = (await res.json()) as {
    success?: boolean;
    transcript?: string;
    engine?: 'groq';
    fallback?: 'webspeech';
    message?: string;
  };

  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Không chấm được phát âm');
  }

  if (json.transcript && json.engine === 'groq') {
    return { transcript: json.transcript, engine: 'groq' };
  }

  if (json.fallback === 'webspeech' || !json.transcript) {
    if (!isWebSpeechAvailable()) {
      throw new Error(
        'Hết hạn mức chấm âm thanh và trình duyệt không hỗ trợ nhận dạng giọng nói. Thử Chrome hoặc thêm GROQ_API_KEY.'
      );
    }
    onFallback?.();
    const transcript = await recognizeWithWebSpeech();
    return { transcript, engine: 'webspeech' };
  }

  return { transcript: json.transcript, engine: 'groq' };
}

export function PronunciationGame({ courseId }: Props) {
  const [data, setData] = useState<PronunciationGameResponse | null>(null);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [panel, setPanel] = useState<Panel>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<PronunciationMode>('phoneme');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [showActions, setShowActions] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [playSessionId, setPlaySessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const questionStartTime = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const micSession = useRef<MicSession | null>(null);

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

        const questions = (json.questions || []).map((item) => ({
          ...item,
          mode: item.mode === 'word' ? 'phoneme' : item.mode || 'phoneme',
        }));
        const nextStatuses = normalizeStatuses(json.statuses, questions.length);
        const firstEmpty = nextEmptyPlayableIndex(questions, nextStatuses);
        const startIndex = firstEmpty === -1 ? (playableQuestionEntries(questions)[0]?.index ?? 0) : firstEmpty;
        const startMode = questions[startIndex]?.mode || playableModes(questions)[0] || 'phoneme';

        setData({ ...json, questions });
        setStatuses(nextStatuses);
        setCurrentMode(startMode);
        setCurrentIndex(startIndex);
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
      micSession.current?.cancel();
      micSession.current = null;
      if (activeAudio.current) {
        activeAudio.current.pause();
        activeAudio.current = null;
      }
    };
  }, [courseId]);

  const questions = useMemo(() => data?.questions || [], [data?.questions]);
  const course = data?.course;
  const playableEntries = useMemo(() => playableQuestionEntries(questions), [questions]);
  const maxScore = playableEntries.length * 200;
  const stats = useMemo<PronunciationStats>(() => {
    let correct = 0;
    let wrong = 0;
    for (const { index } of playableEntries) {
      if (statuses[index] === 'correct') correct += 1;
      else if (statuses[index] === 'wrong') wrong += 1;
    }
    return {
      total: playableEntries.length,
      correct,
      wrong,
      pending: Math.max(playableEntries.length - correct - wrong, 0),
    };
  }, [playableEntries, statuses]);
  const progressPercent = maxScore ? Math.min(100, Math.round((sessionPoints / maxScore) * 100)) : 0;

  const resetQuestionState = useCallback(
    (index: number, mode: PronunciationMode) => {
      questionStartTime.current = Date.now();
      setAnswerResult(null);
      setSubmitMessage('');
      micSession.current?.cancel();
      micSession.current = null;
      clearAutoAdvance(advanceTimer);

      const prevStatus = statuses[index];
      if (isGradedStatus(prevStatus)) {
        setRecordState('done');
        setShowActions(true);
      } else {
        setRecordState('idle');
        setShowActions(false);
      }

      setCurrentIndex(index);
      setCurrentMode(mode);
      setPanel('question');
    },
    [statuses]
  );

  // Reset UI only when navigating to another question — NOT when statuses
  // update after scoring (that used to wipe answerResult and hide score rings).
  useEffect(() => {
    if (panel !== 'question' || !questions.length) return;
    const question = questions[currentIndex];
    if (!question) return;
    questionStartTime.current = Date.now();
    setSubmitMessage('');
    micSession.current?.cancel();
    micSession.current = null;

    if (isGradedStatus(statuses[currentIndex])) {
      setAnswerResult(null);
      setRecordState('done');
      setShowActions(true);
    } else {
      setAnswerResult(null);
      setRecordState('idle');
      setShowActions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit statuses
  }, [currentIndex, panel, questions]);

  async function persistProgress(
    nextStatuses: ProgressStatus[],
    reset = false,
    sessionId?: string | null
  ) {
    if (!course) return null;

    const json = await persistGameProgress({
      courseKey: progressCourseKey(course.name, course.levelName),
      game: 'pronunciation',
      statuses: nextStatuses,
      reset,
      playSessionId: sessionId === undefined ? playSessionId : sessionId,
    });
    if (!json.success) {
      throw new Error(json.message || 'Không lưu được tiến độ');
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

  function scheduleAdvance() {
    scheduleAutoAdvance(advanceTimer, goNext);
  }

  function goNext() {
    if (!questions.length) return;
    clearAutoAdvance(advanceTimer);
    const nextIndex = nextPlayableIndex(questions, currentIndex);
    if (nextIndex === -1) {
      setPanel('result');
      return;
    }
    resetQuestionState(nextIndex, questions[nextIndex]?.mode || currentMode);
  }

  function openQuestion(index: number) {
    const question = questions[index];
    if (!question) return;
    void (async () => {
      try {
        await ensurePlaySession();
        resetQuestionState(index, question.mode || 'phoneme');
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : 'Không mở được câu hỏi');
      }
    })();
  }

  function startOrContinue() {
    const firstEmpty = nextEmptyPlayableIndex(questions, statuses);
    if (firstEmpty === -1) return;
    void (async () => {
      try {
        await ensurePlaySession();
        openQuestion(firstEmpty);
      } catch (err) {
        setSubmitMessage(err instanceof Error ? err.message : 'Không bắt đầu được bài');
      }
    })();
  }

  async function resetProgress(openFirstQuestion: boolean) {
    if (!course || isResetting) return;

    const emptyStatuses = Array.from({ length: questions.length }, () => 'empty' as ProgressStatus);
    const firstPlayable = playableEntries[0]?.index ?? 0;
    const nextSession = createPlaySessionId();

    setIsResetting(true);
    setSubmitMessage('');

    try {
      setStatuses(emptyStatuses);
      setSessionPoints(0);
      setAnswerResult(null);
      setRecordState('idle');
      setShowActions(false);
      setCurrentIndex(firstPlayable);
      setCurrentMode(questions[firstPlayable]?.mode || 'phoneme');
      setPlaySessionId(nextSession);
      await persistProgress(emptyStatuses, true, nextSession);
      if (openFirstQuestion) {
        setPanel('question');
        questionStartTime.current = Date.now();
      } else {
        setPanel('list');
      }
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Không làm lại được bài');
    } finally {
      setIsResetting(false);
    }
  }

  function handleModeChange(mode: PronunciationMode) {
    const nextIndex = findFirstQuestionByMode(questions, mode);
    resetQuestionState(nextIndex, mode);
  }

  async function finishWithScore(
    score: TranscriptScoreResult,
    engine: 'groq' | 'webspeech'
  ) {
    if (!course || !questions[currentIndex]) return;

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const alreadyAnswered = statuses[currentIndex] !== 'empty';
      let points: number | undefined;

      if (!alreadyAnswered) {
        const sessionId = await ensurePlaySession();
        const elapsedMs = Date.now() - questionStartTime.current;
        const submit = await submitAnswerScore(
          progressCourseKey(course.name, course.levelName),
          'pronunciation',
          currentIndex,
          score.isCorrect,
          elapsedMs,
          sessionId
        );
        if (!submit.success) {
          throw new Error(submit.message || 'Không ghi được điểm');
        }
        points = submit.points;
        if (typeof points === 'number') {
          setSessionPoints((current) => current + points!);
        }
        if (typeof submit.gameScore === 'number') {
          setGameScore(submit.gameScore);
        }
      }

      const nextStatuses = [...statuses];
      nextStatuses[currentIndex] = score.isCorrect ? 'correct' : 'wrong';

      // Set result UI before statuses so learners see rings immediately.
      setAnswerResult({ isCorrect: score.isCorrect, points, score, engine });
      setRecordState('done');
      setShowActions(true);
      setStatuses(nextStatuses);
      await persistProgress(nextStatuses);
      scheduleAdvance();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không nộp được câu trả lời';
      setSubmitMessage(message);
      setRecordState('idle');
      if (/đăng nhập/i.test(message)) {
        window.setTimeout(() => {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }, 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMicClick() {
    if (isSubmitting || recordState === 'assessing') return;
    const question = questions[currentIndex];
    if (!question) return;
    if (isGradedStatus(statuses[currentIndex]) || answerResult) return;

    if (recordState === 'recording' && micSession.current) {
      micSession.current.stop();
      return;
    }

    setShowActions(false);
    setAnswerResult(null);
    setSubmitMessage('');
    setRecordState('recording');

    try {
      const session = await startMicRecording(8000);
      micSession.current = session;

      void (async () => {
        try {
          const clip = await session.done;
          if (micSession.current !== session) return;
          micSession.current = null;
          setRecordState('assessing');
          const { transcript, engine } = await assessClip(clip, question, () => {
            setSubmitMessage('Đang dùng nhận dạng trình duyệt — hãy đọc lại rõ…');
          });
          setSubmitMessage('');
          const score = scoreTranscript(
            question.targetText,
            transcript,
            String(question.mode || 'phoneme')
          );
          await finishWithScore(score, engine);
        } catch (err) {
          if (micSession.current === session) micSession.current = null;
          const message = err instanceof Error ? err.message : 'Không chấm được phát âm';
          if (message === 'Đã hủy ghi âm') {
            setRecordState('idle');
            return;
          }
          setRecordState('idle');
          setSubmitMessage(message);
        }
      })();
    } catch (err) {
      setRecordState('idle');
      setSubmitMessage(
        err instanceof Error
          ? err.message
          : 'Không mở được micro. Hãy cho phép quyền micro rồi thử lại.'
      );
    }
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

  if (questions.length === 0 || playableModes(questions).length === 0) {
    return (
      <div className="pronunciation-page">
        <DataLoading
          variant="message"
          message="Chưa có câu hỏi Phát âm (luyện từ/câu) cho khóa học này"
        />
      </div>
    );
  }

  return (
    <PronunciationGameContent
      course={course}
      questions={questions}
      statuses={statuses}
      panel={panel}
      currentIndex={currentIndex}
      currentMode={currentMode}
      recordState={recordState}
      showActions={showActions}
      sessionPoints={sessionPoints}
      maxScore={maxScore}
      progressPercent={progressPercent}
      answerResult={answerResult}
      submitMessage={submitMessage}
      isSubmitting={isSubmitting}
      isResetting={isResetting}
      stats={stats}
      gameScore={gameScore}
      onBackHome={() => {
        window.location.href = `/courses/${course.id}`;
      }}
      onBackToList={() => {
        clearAutoAdvance(advanceTimer);
        micSession.current?.cancel();
        micSession.current = null;
        setPanel('list');
      }}
      onOpenQuestion={openQuestion}
      onStartContinue={startOrContinue}
      onRetry={() => {
        void resetProgress(false);
      }}
      onRetryFromStart={() => {
        void resetProgress(true);
      }}
      onViewResult={() => setPanel('result')}
      onModeChange={handleModeChange}
      onResetQuestion={() => resetQuestionState(currentIndex, currentMode)}
      onPlayReference={() => handlePlay(1.0)}
      onPlaySlow={() => handlePlay(0.7)}
      onMicClick={() => void handleMicClick()}
      onNext={goNext}
    />
  );
}
