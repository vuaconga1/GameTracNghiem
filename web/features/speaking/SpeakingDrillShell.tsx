'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PageBackButton } from '@/components/PageBackButton';
import type { SpeakingAccessReason } from '@/lib/speaking/access';
import { speakingHubPath } from '@/lib/speaking/hubRoutes';
import type {
  SpeakingDrillActivityType,
  StudentSpeakingDrill,
} from '@/lib/speaking/drillSchemas';

const ACTIVITY_KEYS: Record<SpeakingDrillActivityType, string> = {
  WORD_PRONUNCIATION: 'word',
  SENTENCE_READING: 'sentence',
  GUIDED_ANSWER: 'guided',
};

type RecorderState =
  | 'idle'
  | 'requesting'
  | 'countdown'
  | 'recording'
  | 'recorded'
  | 'submitting'
  | 'result';

type DrillResult = {
  id: string;
  transcript: string;
  score: number;
  feedback: {
    label?: string;
    praise?: string;
    improvement?: string;
    disclaimer?: string;
  };
};

type DrillsResponse = {
  success?: boolean;
  message?: string;
  maxDurationSeconds?: number;
  exercises?: StudentSpeakingDrill[];
};

function requestKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `drill-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function supportedRecorderMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return (
    candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
  );
}

function reportMicAnalytics(
  activityType: SpeakingDrillActivityType,
  outcome: 'granted' | 'denied',
) {
  return fetch('/api/speaking/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wewin-csrf': '1',
    },
    body: JSON.stringify({ event: outcome, activityType }),
  }).catch(() => undefined);
}

export function SpeakingDrillFeedback({ result }: { result: DrillResult }) {
  const { t } = useI18n();
  return (
    <section className="speaking-drill-feedback" aria-live="polite">
      <div className="speaking-drill-score" aria-label={`${result.score}/100`}>
        {result.score}
        <span>/100</span>
      </div>
      <div>
        <p className="speaking-drill-feedback-label">
          {result.feedback.label || t('speaking.drill.practiceFeedback')}
        </p>
        <p className="speaking-drill-feedback-line is-praise">
          <i className="fas fa-star" aria-hidden="true" />
          <span>
            <strong>{t('speaking.drill.praise')}:</strong>{' '}
            {result.feedback.praise}
          </span>
        </p>
        <p className="speaking-drill-feedback-line is-improvement">
          <i className="fas fa-lightbulb" aria-hidden="true" />
          <span>
            <strong>{t('speaking.drill.improvement')}:</strong>{' '}
            {result.feedback.improvement}
          </span>
        </p>
        {result.feedback.disclaimer ? (
          <p className="speaking-drill-disclaimer">
            {result.feedback.disclaimer}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function SpeakingDrillMicState({
  state,
  countdown,
  waveform,
}: {
  state: RecorderState;
  countdown: number | null;
  waveform: number[];
}) {
  const { t } = useI18n();
  const label =
    state === 'requesting'
      ? t('speaking.drill.requestingMic')
      : state === 'countdown'
        ? t('speaking.drill.countdown')
        : state === 'recording'
          ? t('speaking.drill.recording')
          : state === 'recorded' || state === 'submitting'
            ? t('speaking.drill.recorded')
            : t('speaking.drill.micIdle');
  return (
    <div className={`speaking-drill-mic-state is-${state}`} role="status">
      {state === 'countdown' && countdown ? (
        <span className="speaking-drill-countdown" aria-live="assertive">
          {countdown}
        </span>
      ) : (
        <span
          className={`speaking-drill-live-dot ${
            state === 'recording' ? 'is-recording' : ''
          }`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
      <div
        className="speaking-drill-waveform"
        aria-label={t('speaking.drill.waveform')}
      >
        {waveform.map((height, index) => (
          <span
            // The bar position is stable for the life of this visual meter.
            key={index}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SpeakingDrillShell({
  courseId,
  activityType,
  accessReason,
}: {
  courseId: string;
  activityType: SpeakingDrillActivityType;
  accessReason?: SpeakingAccessReason;
}) {
  const { t, locale } = useI18n();
  const activityKey = ACTIVITY_KEYS[activityType];
  const hubPath = speakingHubPath(courseId);
  const [loading, setLoading] = useState(!accessReason);
  const [loadError, setLoadError] = useState('');
  const [exercises, setExercises] = useState<StudentSpeakingDrill[]>([]);
  const [maxDurationSeconds, setMaxDurationSeconds] = useState(60);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [recorderState, setRecorderState] =
    useState<RecorderState>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [waveform, setWaveform] = useState<number[]>(
    () => new Array(16).fill(8),
  );
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [recordedDurationMs, setRecordedDurationMs] = useState(0);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [actionError, setActionError] = useState('');
  const [result, setResult] = useState<DrillResult | null>(null);

  const mountedRef = useRef(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exercise = exercises[exerciseIndex];
  const promptText = exercise?.targetText || exercise?.questionText || '';
  const listenText =
    exercise?.targetText || exercise?.sampleAnswers[0] || exercise?.questionText;

  const stopMedia = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setWaveform(new Array(16).fill(8));
  }, []);

  const clearRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl('');
    setRecordedDurationMs(0);
    setIdempotencyKey('');
    setResult(null);
    setActionError('');
    setRecorderState('idle');
    setCountdown(null);
  }, [recordedUrl]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder?.state === 'recording') recorder.stop();
      stopMedia();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl, stopMedia]);

  useEffect(() => {
    if (accessReason) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch(
          `/api/speaking/drills?courseId=${encodeURIComponent(courseId)}&activityType=${activityType}`,
          { signal: controller.signal },
        );
        const body = (await response.json()) as DrillsResponse;
        if (!response.ok || !body.success) {
          throw new Error(body.message || t('speaking.drill.loadFailed'));
        }
        if (controller.signal.aborted) return;
        setExercises(body.exercises ?? []);
        setMaxDurationSeconds(
          Math.max(1, Math.min(180, body.maxDurationSeconds ?? 60)),
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : t('speaking.drill.loadFailed'),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [accessReason, activityType, courseId, t]);

  const animateWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);
    const stride = Math.max(1, Math.floor(values.length / 16));
    setWaveform(
      Array.from({ length: 16 }, (_, index) => {
        const amplitude = values[index * stride] ?? 0;
        return Math.max(6, Math.round((amplitude / 255) * 34));
      }),
    );
    animationFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = useCallback(async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setActionError(t('speaking.drill.unsupportedMic'));
      return;
    }
    setActionError('');
    setRecorderState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      void reportMicAnalytics(activityType, 'granted');
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = supportedRecorderMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stopMedia();
        setRecorderState('idle');
        setActionError(t('speaking.drill.recordFailed'));
      };
      recorder.onstop = () => {
        const durationMs = Math.max(300, Date.now() - startedAtRef.current);
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        stopMedia();
        if (!mountedRef.current) return;
        if (blob.size < 12) {
          setRecorderState('idle');
          setActionError(t('speaking.drill.recordTooShort'));
          return;
        }
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordedDurationMs(durationMs);
        setIdempotencyKey(requestKey());
        setRecorderState('recorded');
      };

      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

      setRecorderState('countdown');
      for (const value of [3, 2, 1]) {
        if (!mountedRef.current) return;
        setCountdown(value);
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      if (!mountedRef.current) return;
      setCountdown(null);
      recorder.start(250);
      startedAtRef.current = Date.now();
      setRecorderState('recording');
      if (analyserRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateWaveform);
      }
      autoStopTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, maxDurationSeconds * 1_000);
    } catch {
      void reportMicAnalytics(activityType, 'denied');
      stopMedia();
      setRecorderState('idle');
      setActionError(t('speaking.drill.micDenied'));
    }
  }, [activityType, animateWaveform, maxDurationSeconds, stopMedia, t]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  }, []);

  const listenSample = useCallback(async () => {
    if (!exercise || !listenText) return;
    setActionError('');
    try {
      if (exercise.reference?.audioUrl) {
        const audio = new Audio(exercise.reference.audioUrl);
        await audio.play();
        return;
      }
      if (!('speechSynthesis' in window)) {
        throw new Error('speech synthesis unavailable');
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(listenText);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      setActionError(t('speaking.drill.listenFailed'));
    }
  }, [exercise, listenText, t]);

  const submitRecording = useCallback(async () => {
    if (!exercise || !recordedBlob || !idempotencyKey) return;
    setRecorderState('submitting');
    setActionError('');
    const form = new FormData();
    form.set('courseId', courseId);
    form.set('questionId', exercise.id);
    form.set('activityType', activityType);
    form.set('idempotencyKey', idempotencyKey);
    form.set('audioDurationMs', String(recordedDurationMs));
    form.set('locale', locale);
    form.set(
      'audio',
      new File([recordedBlob], 'speaking-drill.webm', {
        type: recordedBlob.type || 'audio/webm',
      }),
    );
    try {
      const response = await fetch('/api/speaking/drills/attempts', {
        method: 'POST',
        headers: { 'x-wewin-csrf': '1' },
        body: form,
      });
      const body = (await response.json()) as {
        success?: boolean;
        message?: string;
        attempt?: DrillResult;
      };
      if (!response.ok || !body.success || !body.attempt) {
        throw new Error(body.message || t('speaking.drill.submitFailed'));
      }
      setResult(body.attempt);
      setRecorderState('result');
    } catch (error) {
      setRecorderState('recorded');
      setActionError(
        error instanceof Error
          ? error.message
          : t('speaking.drill.submitFailed'),
      );
    }
  }, [
    activityType,
    courseId,
    exercise,
    idempotencyKey,
    locale,
    recordedBlob,
    recordedDurationMs,
    t,
  ]);

  const goNext = useCallback(() => {
    clearRecording();
    setExerciseIndex((index) =>
      exercises.length > 0 ? (index + 1) % exercises.length : 0,
    );
  }, [clearRecording, exercises.length]);

  const stateActions = useMemo(
    () => ({
      canStart: recorderState === 'idle',
      canStop: recorderState === 'recording',
      canSubmit: recorderState === 'recorded',
    }),
    [recorderState],
  );

  return (
    <section className="view-detail speaking-hub speaking-drill-shell">
      <PageBackButton href={hubPath} />
      <div className="speaking-hub-shell">
        {accessReason ? (
          <div className="speaking-drill-panel" role="status">
            <div className="speaking-drill-icon" aria-hidden="true">
              <i className="fas fa-lock" />
            </div>
            <p className="speaking-hub-eyebrow">
              {t(`speaking.hub.activities.${activityKey}.title`)}
            </p>
            <h1>{t(`speaking.access.${accessReason}.title`)}</h1>
            <p>{t(`speaking.access.${accessReason}.detail`)}</p>
            <Link className="admin-btn primary speaking-btn" href={hubPath}>
              <i className="fas fa-arrow-left" aria-hidden="true" />
              {t('speaking.drill.backToHub')}
            </Link>
          </div>
        ) : loading ? (
          <div className="speaking-drill-panel">
            <DataLoading />
          </div>
        ) : loadError ? (
          <div className="speaking-drill-panel" role="alert">
            <div className="speaking-drill-icon" aria-hidden="true">
              <i className="fas fa-triangle-exclamation" />
            </div>
            <h1>{t('speaking.drill.loadFailed')}</h1>
            <p>{loadError}</p>
            <Link className="admin-btn speaking-btn" href={hubPath}>
              {t('speaking.drill.backToHub')}
            </Link>
          </div>
        ) : !exercise ? (
          <div className="speaking-drill-panel" role="status">
            <div className="speaking-drill-icon" aria-hidden="true">
              <i className="fas fa-inbox" />
            </div>
            <h1>{t('speaking.drill.emptyTitle')}</h1>
            <p>{t('speaking.drill.emptyDetail')}</p>
            <Link className="admin-btn speaking-btn" href={hubPath}>
              {t('speaking.drill.backToHub')}
            </Link>
          </div>
        ) : (
          <article className="speaking-drill-workspace">
            <header className="speaking-drill-header">
              <div>
                <p className="speaking-hub-eyebrow">
                  {t(`speaking.hub.activities.${activityKey}.title`)}
                </p>
                <h1>{promptText}</h1>
                <p>
                  {t('speaking.drill.progress', {
                    current: exerciseIndex + 1,
                    total: exercises.length,
                  })}
                </p>
              </div>
              {listenText ? (
                <button
                  type="button"
                  className="admin-btn speaking-drill-listen"
                  onClick={() => void listenSample()}
                >
                  <i className="fas fa-volume-high" aria-hidden="true" />
                  {t('speaking.drill.listenSample')}
                </button>
              ) : null}
            </header>

            {exercise.hints.length > 0 ||
            exercise.sampleAnswers.length > 0 ||
            exercise.reference?.text ? (
              <details className="speaking-drill-support">
                <summary>{t('speaking.drill.showHelp')}</summary>
                {exercise.hints.map((hint) => (
                  <p key={hint}>
                    <i className="fas fa-lightbulb" aria-hidden="true" /> {hint}
                  </p>
                ))}
                {exercise.sampleAnswers[0] ? (
                  <p>
                    <strong>{t('speaking.drill.sampleAnswer')}:</strong>{' '}
                    {exercise.sampleAnswers[0]}
                  </p>
                ) : null}
                {exercise.reference?.text ? (
                  <p>{exercise.reference.text}</p>
                ) : null}
              </details>
            ) : null}

            <div className="speaking-drill-recorder">
              <SpeakingDrillMicState
                state={recorderState}
                countdown={countdown}
                waveform={waveform}
              />

              {recordedUrl ? (
                <div className="speaking-drill-playback">
                  <label htmlFor="speaking-drill-playback">
                    {t('speaking.drill.playback')}
                  </label>
                  <audio
                    id="speaking-drill-playback"
                    controls
                    preload="metadata"
                    src={recordedUrl}
                  />
                </div>
              ) : null}

              {recorderState === 'submitting' ? (
                <DataLoading />
              ) : null}

              {result && recorderState === 'result' ? (
                <SpeakingDrillFeedback result={result} />
              ) : null}

              {actionError ? (
                <div className="speaking-banner speaking-banner--warn" role="alert">
                  <i
                    className="fas fa-triangle-exclamation"
                    aria-hidden="true"
                  />
                  <span>{actionError}</span>
                </div>
              ) : null}

              <div className="speaking-drill-actions">
                {stateActions.canStart ? (
                  <button
                    type="button"
                    className="speaking-drill-mic-button"
                    onClick={() => void startRecording()}
                    aria-label={t('speaking.drill.startRecording')}
                  >
                    <i className="fas fa-microphone" aria-hidden="true" />
                    <span>{t('speaking.drill.startRecording')}</span>
                  </button>
                ) : null}
                {stateActions.canStop ? (
                  <button
                    type="button"
                    className="speaking-drill-mic-button is-stop"
                    onClick={stopRecording}
                    aria-label={t('speaking.drill.stopRecording')}
                  >
                    <i className="fas fa-stop" aria-hidden="true" />
                    <span>{t('speaking.drill.stopRecording')}</span>
                  </button>
                ) : null}
                {stateActions.canSubmit ? (
                  <button
                    type="button"
                    className="admin-btn primary speaking-btn"
                    onClick={() => void submitRecording()}
                  >
                    <i className="fas fa-paper-plane" aria-hidden="true" />
                    {t('speaking.drill.submitRecording')}
                  </button>
                ) : null}
                {(recorderState === 'recorded' ||
                  recorderState === 'result') && (
                  <button
                    type="button"
                    className="admin-btn speaking-btn"
                    onClick={clearRecording}
                  >
                    <i className="fas fa-rotate-left" aria-hidden="true" />
                    {t('speaking.drill.retry')}
                  </button>
                )}
                {recorderState === 'result' ? (
                  <button
                    type="button"
                    className="admin-btn primary speaking-btn"
                    onClick={goNext}
                  >
                    {t('speaking.drill.next')}
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
