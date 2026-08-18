'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PageBackButton } from '@/components/PageBackButton';
import {
  openMicStream,
  setAiSpeaking,
} from '@/lib/audio/echoGate';
import {
  appendTranscriptLine,
  type TranscriptLine,
} from '@/lib/speaking/appendTranscriptLine';
import { getSpeakingOpeningInstructions } from '@/lib/speaking/prompts';
import { isSentenceCorrectionSpeakingGrade } from '@/lib/speaking/gradeBand';
import type { SpeakingAccessReason } from '@/lib/speaking/access';
import { speakingHubPath } from '@/lib/speaking/hubRoutes';
import {
  pttBeginEvents,
  pttDisableVadEvent,
  pttEndEvents,
  shouldCommitPushToTalk,
} from '@/lib/speaking/pushToTalk';
import { SpeakingAccessNotice } from '@/features/speaking/SpeakingAccessNotice';

type Topic = {
  id: string;
  title: string;
  durationSeconds: number;
};

type DailyUsage = {
  canStart: boolean;
  status: string;
  remainingToday: number;
  dailyLimit: number;
  nextAvailableAt: string | null;
  reservedUntil: string | null;
  reservationActive: boolean;
  session?: {
    id: string;
    status: string;
    mustEndAt?: string | null;
    transcript?: unknown;
    recordingUrl?: string | null;
    topic?: { id: string; title: string; durationSeconds: number } | null;
  } | null;
};

type AccessResponse = {
  success?: boolean;
  message?: string;
  access?: {
    allowed: boolean;
    reason: SpeakingAccessReason;
  };
};

type Phase = 'loading' | 'prepare' | 'connecting' | 'active' | 'finishing' | 'done' | 'blocked' | 'error';

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function realtimeSecondsRemaining(mustEndAt: string, nowMs = Date.now()) {
  const deadlineMs = Date.parse(mustEndAt);
  if (!Number.isFinite(deadlineMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function crossedRealtimeWarningThreshold(
  previousSeconds: number,
  nextSeconds: number,
) {
  return previousSeconds > 30 && nextSeconds <= 30 && nextSeconds > 0;
}

function isRealtimeSessionReusable(
  session: DailyUsage['session'],
  nowMs = Date.now(),
) {
  return Boolean(
    session &&
      ['RESERVED', 'CONNECTING', 'ACTIVE'].includes(session.status) &&
      (!session.mustEndAt || Date.parse(session.mustEndAt) > nowMs),
  );
}

function isAiAudioStartEvent(type: string) {
  // Only buffer start — not every audio delta (those fire continuously).
  return type === 'output_audio_buffer.started';
}

function isAiAudioStopEvent(type: string) {
  return (
    type === 'output_audio_buffer.stopped' ||
    type === 'response.output_audio.done' ||
    type === 'response.audio.done'
  );
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    setTimeout(done, timeoutMs);
  });
}

export function SpeakingPracticeView({
  courseId,
  courseName,
  topicId,
  levelName,
}: {
  courseId: string;
  courseName?: string;
  topicId?: string;
  levelName?: string | null;
}) {
  const { t, locale } = useI18n();
  const numberLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const sentenceCorrection = isSentenceCorrectionSpeakingGrade({ levelName });
  const openingInstructions = getSpeakingOpeningInstructions({ levelName });

  const searchParams = useSearchParams();
  const previewSessionId = searchParams.get('previewSession');
  const hubPath = speakingHubPath(courseId);
  const useLegacyClientSecret =
    Boolean(previewSessionId) && searchParams.get('legacyRealtime') === '1';

  const [phase, setPhase] = useState<Phase>('loading');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState(topicId || '');
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(300);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [statusNote, setStatusNote] = useState('');
  const [accessReason, setAccessReason] = useState<SpeakingAccessReason | null>(null);
  const [pttHeld, setPttHeld] = useState(false);
  const [aiTalking, setAiTalking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedSentRef = useRef(false);
  const startIdempotencyKeyRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const finishingRef = useRef(false);
  const mustEndAtRef = useRef<string | null>(null);
  const startedRequestRef = useRef<Promise<string | null> | null>(null);
  const countdownDeadlineRef = useRef<string | null>(null);
  const countdownWarningSentRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const seenUserTranscriptItemIdsRef = useRef<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement | null>(null);
  const aiSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSpeakingRef = useRef(false);
  const pttHeldRef = useRef(false);
  const pttHoldStartedAtRef = useRef<number | null>(null);
  const realtimeUsageRef = useRef({
    inputTokens: 0,
    outputTokens: 0,
    audioInputTokens: 0,
    audioOutputTokens: 0,
  });

  function sendRealtimeEvent(payload: Record<string, unknown>) {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return false;
    try {
      dc.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function setLocalMicEnabled(enabled: boolean) {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  /** Flag only for echo gate — mic unmute is driven by push-to-talk hold. */
  function applyAiSpeaking(speaking: boolean) {
    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
      aiSpeakingTimeoutRef.current = null;
    }
    aiSpeakingRef.current = speaking;
    setAiTalking(speaking);
    setAiSpeaking(speaking);
    // Safety: never leave STT blocked if stop event is missed.
    if (speaking) {
      aiSpeakingTimeoutRef.current = setTimeout(() => {
        aiSpeakingRef.current = false;
        setAiTalking(false);
        setAiSpeaking(false);
        aiSpeakingTimeoutRef.current = null;
      }, 12_000);
    }
  }

  function beginPushToTalk() {
    if (phase !== 'active' || finishingRef.current || pttHeldRef.current) return;
    pttHeldRef.current = true;
    pttHoldStartedAtRef.current = Date.now();
    setPttHeld(true);
    for (const event of pttBeginEvents({ interruptAi: aiSpeakingRef.current })) {
      sendRealtimeEvent(event);
    }
    if (aiSpeakingRef.current) {
      applyAiSpeaking(false);
    }
    setLocalMicEnabled(true);
    setStatusNote(t('speaking.pttHolding'));
  }

  function endPushToTalk() {
    if (!pttHeldRef.current) return;
    const heldMs =
      pttHoldStartedAtRef.current != null
        ? Date.now() - pttHoldStartedAtRef.current
        : 0;
    pttHeldRef.current = false;
    pttHoldStartedAtRef.current = null;
    setPttHeld(false);
    setLocalMicEnabled(false);

    if (!shouldCommitPushToTalk(heldMs)) {
      sendRealtimeEvent({ type: 'input_audio_buffer.clear' });
      setStatusNote(
        aiSpeakingRef.current ? t('speaking.pttWaitAi') : t('speaking.pttHint'),
      );
      return;
    }

    for (const event of pttEndEvents()) {
      sendRealtimeEvent(event);
    }
    setStatusNote(t('speaking.pttWaitingReply'));
  }

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) || null;
  const isLive = phase === 'connecting' || phase === 'active' || phase === 'finishing';
  const showChat = isLive || phase === 'blocked' || phase === 'done';
  const headerSubtitle =
    selectedTopic?.title ||
    usage?.session?.topic?.title ||
    courseName ||
    t('speaking.practiceTitle');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setPhase('loading');
    setError('');
    setAccessReason(null);
    try {
      if (!previewSessionId) {
        const accessRes = await fetch(
          `/api/speaking/access?courseId=${encodeURIComponent(courseId)}&activityType=REALTIME_CONVERSATION`,
        );
        const accessJson = (await accessRes.json()) as AccessResponse;
        if (!accessRes.ok || !accessJson.success || !accessJson.access) {
          throw new Error(accessJson.message || t('speaking.loadFailed'));
        }
        if (!accessJson.access.allowed) {
          setAccessReason(accessJson.access.reason);
          setTopics([]);
          if (accessJson.access.reason !== 'DAILY_LIMIT_REACHED') {
            setUsage(null);
            setPhase('blocked');
            return;
          }

          const usageRes = await fetch(
            `/api/speaking/daily-usage?courseId=${encodeURIComponent(courseId)}`,
          );
          const usageJson = await usageRes.json();
          if (!usageRes.ok || !usageJson.success) {
            throw new Error(usageJson.message || t('speaking.loadUsageFailed'));
          }
          setUsage(usageJson as DailyUsage);
          if (usageJson.session?.transcript) {
            const lines = normalizeTranscript(usageJson.session.transcript);
            setTranscript(lines);
            transcriptRef.current = lines;
          }
          if (!isRealtimeSessionReusable(usageJson.session)) {
            setPhase('blocked');
            return;
          }
          if (usageJson.session?.topic) {
            setTopics([usageJson.session.topic]);
            setSelectedTopicId(usageJson.session.topic.id);
            setPhase('prepare');
            return;
          }
        }
      }

      const [topicsRes, usageRes] = await Promise.all([
        fetch(`/api/speaking/topics?courseId=${encodeURIComponent(courseId)}`),
        fetch(`/api/speaking/daily-usage?courseId=${encodeURIComponent(courseId)}`),
      ]);
      const topicsJson = await topicsRes.json();
      const usageJson = await usageRes.json();
      if (!topicsRes.ok || !topicsJson.success) {
        throw new Error(topicsJson.message || t('speaking.loadTopicsFailed'));
      }
      if (!usageRes.ok || !usageJson.success) {
        throw new Error(usageJson.message || t('speaking.loadUsageFailed'));
      }

      const list = (topicsJson.topics || []) as Topic[];
      setTopics(list);
      setUsage(usageJson as DailyUsage);

      const initial =
        topicId && list.some((t) => t.id === topicId)
          ? topicId
          : usageJson.session?.topic?.id &&
              list.some((t) => t.id === usageJson.session.topic.id)
            ? usageJson.session.topic.id
          : list[0]?.id || '';
      setSelectedTopicId((prev) => prev || initial);

      if (
        !usageJson.canStart &&
        usageJson.status === 'CONSUMED' &&
        !previewSessionId &&
        !isRealtimeSessionReusable(usageJson.session)
      ) {
        setPhase('blocked');
        if (usageJson.session?.transcript) {
          const lines = normalizeTranscript(usageJson.session.transcript);
          setTranscript(lines);
          transcriptRef.current = lines;
        }
      } else if (!opts?.silent) {
        setPhase('prepare');
      } else {
        setPhase((p) => (p === 'loading' || p === 'connecting' || p === 'error' ? 'prepare' : p));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('speaking.loadFailed'));
      setPhase('error');
    }
  }, [courseId, topicId, previewSessionId]);

  useEffect(() => {
    void load();
    return () => {
      cleanupMedia();
    };
  }, [load]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript, phase]);

  function cleanupMedia() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
      aiSpeakingTimeoutRef.current = null;
    }
    pttHeldRef.current = false;
    pttHoldStartedAtRef.current = null;
    setPttHeld(false);
    applyAiSpeaking(false);
  }

  async function checkMic() {
    try {
      const stream = await openMicStream();
      stream.getTracks().forEach((t) => t.stop());
      setMicOk(true);
      setError('');
      void reportMicrophonePermission('granted');
    } catch {
      setMicOk(false);
      setError(t('speaking.micDenied'));
      void reportMicrophonePermission('denied');
    }
  }

  async function reportMicrophonePermission(outcome: 'granted' | 'denied') {
    await fetch('/api/speaking/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wewin-csrf': '1',
      },
      body: JSON.stringify({
        event: outcome,
        activityType: 'REALTIME_CONVERSATION',
      }),
    }).catch(() => undefined);
  }

  function markStarted(id: string): Promise<string | null> {
    if (mustEndAtRef.current) return Promise.resolve(mustEndAtRef.current);
    if (startedRequestRef.current) return startedRequestRef.current;

    const idempotencyKey =
      startIdempotencyKeyRef.current ?? crypto.randomUUID();
    startIdempotencyKeyRef.current = idempotencyKey;
    const request = (async () => {
      startedSentRef.current = true;
      try {
        const response = await fetch(`/api/speaking/sessions/${id}/started`, {
          method: 'POST',
          headers: {
            'Idempotency-Key': idempotencyKey,
            'x-wewin-csrf': '1',
          },
        });
        const body = (await response.json().catch(() => ({}))) as {
          session?: { mustEndAt?: string | null };
        };
        const mustEndAt = body.session?.mustEndAt || null;
        if (!response.ok || !mustEndAt) {
          startedSentRef.current = false;
          return null;
        }
        mustEndAtRef.current = mustEndAt;
        setStatusNote(t('speaking.startedNote'));
        startCountdown(mustEndAt, () => {
          void finishSession(id, 'time');
        });
        return mustEndAt;
      } catch {
        startedSentRef.current = false;
        return null;
      } finally {
        startedRequestRef.current = null;
      }
    })();
    startedRequestRef.current = request;
    return request;
  }

  function appendTranscript(role: 'user' | 'assistant', text: string) {
    setTranscript((prev) => {
      const next = appendTranscriptLine(prev, role, text);
      transcriptRef.current = next;
      return next;
    });
  }

  function handleRealtimeEvent(raw: string, id: string) {
    let event: {
      type?: string;
      transcript?: string;
      delta?: string;
      item_id?: string;
      item?: { role?: string };
      response?: {
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          input_token_details?: { audio_tokens?: number };
          output_token_details?: { audio_tokens?: number };
        };
      };
    };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    const type = String(event.type || '');
    if (type === 'response.done' && event.response?.usage) {
      const usage = event.response.usage;
      realtimeUsageRef.current.inputTokens += Math.max(
        0,
        Number(usage.input_tokens) || 0,
      );
      realtimeUsageRef.current.outputTokens += Math.max(
        0,
        Number(usage.output_tokens) || 0,
      );
      realtimeUsageRef.current.audioInputTokens += Math.max(
        0,
        Number(usage.input_token_details?.audio_tokens) || 0,
      );
      realtimeUsageRef.current.audioOutputTokens += Math.max(
        0,
        Number(usage.output_token_details?.audio_tokens) || 0,
      );
    }
    if (isAiAudioStartEvent(type)) {
      applyAiSpeaking(true);
      void markStarted(id);
      if (!pttHeldRef.current) {
        setStatusNote(t('speaking.pttWaitAi'));
      }
    }
    if (isAiAudioStopEvent(type)) {
      applyAiSpeaking(false);
      if (!pttHeldRef.current && !finishingRef.current) {
        setStatusNote(t('speaking.pttHint'));
      }
    }
    if (
      type === 'response.output_audio_transcript.delta' ||
      type === 'response.audio_transcript.delta'
    ) {
      appendTranscript('assistant', String(event.delta || ''));
    }
    // User ASR finishes asynchronously and often AFTER the assistant already
    // started. Only use .completed (ignore .delta) and dedupe by item_id + text.
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const itemId = String(event.item_id || '').trim();
      if (itemId) {
        if (seenUserTranscriptItemIdsRef.current.has(itemId)) return;
        seenUserTranscriptItemIdsRef.current.add(itemId);
      }
      const text = String(event.transcript || '');
      if (text.trim() && !/[A-Za-z]/.test(text) && /[^\u0000-\u007F]/.test(text)) return;
      appendTranscript('user', text);
    }
  }

  function startCountdown(mustEndAt: string, onDone: () => void) {
    if (countdownDeadlineRef.current === mustEndAt && timerRef.current) return;
    countdownDeadlineRef.current = mustEndAt;
    countdownWarningSentRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    let previous = realtimeSecondsRemaining(mustEndAt);
    setRemainingSec(previous);

    const tick = () => {
      const next = realtimeSecondsRemaining(mustEndAt);
      setRemainingSec(next);
      if (
        !countdownWarningSentRef.current &&
        (crossedRealtimeWarningThreshold(previous, next) ||
          (previous <= 30 && next > 0))
      ) {
        countdownWarningSentRef.current = true;
        setStatusNote(t('speaking.thirtySecondsLeft'));
      }
      previous = next;
      if (next === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onDone();
      }
    };
    tick();
    if (previous > 0) {
      timerRef.current = setInterval(tick, 1000);
    }
  }

  function startMixedRecorder(local: MediaStream, remoteStream: MediaStream | null) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      const localSource = ctx.createMediaStreamSource(local);
      localSource.connect(dest);
      if (remoteStream && remoteStream.getAudioTracks().length) {
        const remoteSource = ctx.createMediaStreamSource(remoteStream);
        remoteSource.connect(dest);
      }
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(dest.stream, { mimeType: mime });
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) recordChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
    } catch {
      setStatusNote(t('speaking.mixRecordFailed'));
    }
  }

  async function finishSession(id: string, reason: 'time' | 'manual' | 'error') {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (pttHeldRef.current) {
      pttHeldRef.current = false;
      pttHoldStartedAtRef.current = null;
      setPttHeld(false);
      setLocalMicEnabled(false);
    }
    setPhase('finishing');
    setStatusNote(reason === 'time' ? t('speaking.endingTime') : t('speaking.endingManual'));

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let blob: Blob | null = null;
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        blob = await new Promise<Blob | null>((resolve) => {
          recorder.onstop = () => {
            const parts = recordChunksRef.current;
            resolve(parts.length ? new Blob(parts, { type: recorder.mimeType || 'audio/webm' }) : null);
          };
          try {
            recorder.stop();
          } catch {
            resolve(null);
          }
        });
      }
    } catch {
      blob = null;
    }

    try {
      dcRef.current?.close();
      pcRef.current?.close();
    } catch {
      /* ignore */
    }

    const consumed = startedSentRef.current;
    if (!consumed) {
      await fetch(`/api/speaking/sessions/${id}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wewin-csrf': '1',
        },
        body: JSON.stringify({
          failed: true,
          errorMessage: reason === 'error' ? error || t('speaking.errorBeforeAi') : t('speaking.cancelBeforeStart'),
        }),
      });
      cleanupMedia();
      await load();
      return;
    }

    await fetch(`/api/speaking/sessions/${id}/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wewin-csrf': '1',
      },
      body: JSON.stringify({
        transcript: transcriptRef.current,
        usage: realtimeUsageRef.current,
      }),
    });

    if (blob && blob.size > 0) {
      const form = new FormData();
      form.append('file', blob, `speaking-${id}.webm`);
      await fetch(`/api/speaking/sessions/${id}/recording`, {
        method: 'POST',
        headers: { 'x-wewin-csrf': '1' },
        body: form,
      });
    }

    cleanupMedia();
    setPhase('done');
    await load();
  }

  async function startPractice() {
    if (!selectedTopic) return;
    if (micOk !== true) {
      setError(t('speaking.checkMicFirst'));
      return;
    }
    if (
      !previewSessionId &&
      !usage?.canStart &&
      !isRealtimeSessionReusable(usage?.session)
    ) {
      setPhase('blocked');
      return;
    }

    const usageSessionIsReusable = isRealtimeSessionReusable(usage?.session);
    const reusableSessionId =
      (startedSentRef.current && sessionId) ||
      (usageSessionIsReusable ? usage!.session!.id : null);

    setError('');
    setPhase('connecting');
    setStatusNote(
      previewSessionId
        ? t('speaking.adminPreviewConnecting')
        : t('speaking.connectingHold')
    );
    startedSentRef.current = false;
    startedRequestRef.current = null;
    mustEndAtRef.current = null;
    countdownDeadlineRef.current = null;
    countdownWarningSentRef.current = false;
    startIdempotencyKeyRef.current = crypto.randomUUID();
    finishingRef.current = false;
    setTranscript([]);
    transcriptRef.current = [];
    seenUserTranscriptItemIdsRef.current = new Set();
    realtimeUsageRef.current = {
      inputTokens: 0,
      outputTokens: 0,
      audioInputTokens: 0,
      audioOutputTokens: 0,
    };

    let createdId: string | null = null;
    try {
      if (previewSessionId) {
        createdId = previewSessionId;
        setSessionId(createdId);
        setRemainingSec(selectedTopic.durationSeconds);
      } else if (reusableSessionId) {
        createdId = reusableSessionId;
        setSessionId(createdId);
        setRemainingSec(
          usage?.session?.mustEndAt
            ? realtimeSecondsRemaining(usage.session.mustEndAt)
            : selectedTopic.durationSeconds,
        );
      } else {
        const createRes = await fetch('/api/speaking/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wewin-csrf': '1',
          },
          body: JSON.stringify({ topicId: selectedTopic.id }),
        });
        const createJson = await createRes.json();
        if (!createRes.ok || !createJson.success) {
          if (createRes.status === 409) {
            setUsage((u) =>
              u
                ? {
                    ...u,
                    canStart: false,
                    status:
                      createJson.code === 'DAILY_SPEAKING_LIMIT_REACHED'
                        ? 'CONSUMED'
                        : u.status,
                    reservedUntil: createJson.reservedUntil || u.reservedUntil,
                  }
                : u
            );
          }
          throw new Error(createJson.message || t('speaking.createSessionFailed'));
        }

        createdId = createJson.session.id as string;
        setSessionId(createdId);
        setRemainingSec(
          createJson.topic.durationSeconds || selectedTopic.durationSeconds,
        );
      }

      const stream = await openMicStream();
      // Push-to-talk: keep mic muted until the student holds the speak button.
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      let remoteStream: MediaStream | null = null;
      pc.ontrack = (e) => {
        remoteStream = e.streams[0] || null;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          void remoteAudioRef.current
            .play()
            .catch(() => setStatusNote(t('speaking.audioStartFailed')));
        }
        if (localStreamRef.current) {
          startMixedRecorder(localStreamRef.current, remoteStream);
        }
      };

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('open', () => {
        sendRealtimeEvent(pttDisableVadEvent());
        sendRealtimeEvent({
          type: 'response.create',
          response: {
            instructions: openingInstructions,
          },
        });
      });
      dc.addEventListener('message', (ev) => {
        if (createdId) handleRealtimeEvent(String(ev.data), createdId);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localSdp = pc.localDescription?.sdp || offer.sdp || '';
      if (!localSdp.includes('v=0') || !localSdp.includes('m=')) {
        throw new Error(t('speaking.sdpOfferFailed'));
      }

      // Default: backend performs the unified SDP exchange and retains the
      // OpenAI Location call ID for the durable hard stop.
      const realtimeUrl = `/api/speaking/sessions/${createdId}/realtime${
        useLegacyClientSecret ? '?legacyClientSecret=1' : ''
      }`;
      const realtimeRes = await fetch(realtimeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'x-wewin-csrf': '1',
        },
        body: localSdp,
      });
      const realtimeJson = await realtimeRes.json().catch(() => ({}));
      if (!realtimeRes.ok || !realtimeJson.success) {
        throw new Error(realtimeJson.message || t('speaking.credentialFailed'));
      }
      let answerSdp = String(realtimeJson.sdpAnswer || '');
      if (
        realtimeJson.transport === 'legacy-client-secret' &&
        typeof realtimeJson.clientSecret === 'string'
      ) {
        const legacySdpRes = await fetch(
          'https://api.openai.com/v1/realtime/calls',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${realtimeJson.clientSecret}`,
              'Content-Type': 'application/sdp',
            },
            body: localSdp,
          },
        );
        answerSdp = await legacySdpRes.text();
        if (!legacySdpRes.ok) {
          throw new Error(
            t('speaking.webrtcError', {
              status: legacySdpRes.status,
              detail: answerSdp.slice(0, 240) || t('speaking.invalidSdp'),
            }),
          );
        }
      }
      if (!answerSdp.includes('v=0')) {
        throw new Error(t('speaking.invalidSdp'));
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setPhase('active');
      setStatusNote(
        previewSessionId
          ? t('speaking.adminPreviewRunning')
          : t('speaking.waitingAiHello')
      );
      setPttHeld(false);
      pttHeldRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('speaking.startSessionFailed');
      setError(message);
      if (createdId && !startedSentRef.current && !previewSessionId) {
        await fetch(`/api/speaking/sessions/${createdId}/finish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wewin-csrf': '1',
          },
          body: JSON.stringify({ failed: true, errorMessage: message }),
        });
        setSessionId(null);
      }
      cleanupMedia();
      setPhase('error');
      if (!previewSessionId) await load({ silent: true });
    }
  }

  if (phase === 'loading') {
    return (
      <section className="view-detail">
        <PageBackButton href={hubPath} title={t('common.back')} />
        <DataLoading />
      </section>
    );
  }

  return (
    <section className="view-detail speaking-practice">
      <PageBackButton href={hubPath} title={t('common.back')} />
      <audio ref={remoteAudioRef} playsInline />

      <div className="speaking-shell">
        <header className="speaking-header">
          <div className="speaking-header-main">
            <div className="speaking-header-icon" aria-hidden="true">
              <i
                className={
                  sentenceCorrection ? 'fas fa-comment-dots' : 'fas fa-comments'
                }
              />
            </div>
            <div className="speaking-header-text">
              <h1>
                {t(
                  sentenceCorrection
                    ? 'speaking.hub.activities.sentenceCorrection.title'
                    : 'speaking.hub.activities.conversation.title',
                )}
              </h1>
              <p>{headerSubtitle}</p>
            </div>
          </div>
          <div className="speaking-header-badges">
            {isLive ? (
              <div className="speaking-timer" aria-live="polite">
                <i className="fas fa-clock" aria-hidden="true" />
                {formatClock(remainingSec)}
              </div>
            ) : usage ? (
              <div
                className={`speaking-quota ${usage.remainingToday > 0 ? 'is-available' : 'is-used'}`}
              >
                <i className="fas fa-ticket" aria-hidden="true" />
                {t('speaking.turnsRemaining', { remaining: usage.remainingToday, limit: usage.dailyLimit })}
              </div>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="speaking-banner speaking-banner--error" role="alert">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}
        {statusNote ? (
          <div className="speaking-banner speaking-banner--info" role="status">
            <i className="fas fa-info-circle" aria-hidden="true" />
            <span>{statusNote}</span>
          </div>
        ) : null}

        <div className="speaking-layout">
          {phase === 'blocked' &&
          accessReason &&
          accessReason !== 'ALLOWED' &&
          accessReason !== 'DAILY_LIMIT_REACHED' ? (
            <SpeakingAccessNotice reason={accessReason} courseId={courseId} />
          ) : null}

          {(phase === 'prepare' || phase === 'error') && usage ? (
            <div className="speaking-prepare">
              <div className="speaking-panel">
                <h2 className="speaking-panel-title">{t('speaking.prepareTitle')}</h2>
                <p className="speaking-panel-note">
                  {t(
                    sentenceCorrection
                      ? 'speaking.prepareHintSentenceCorrection'
                      : 'speaking.prepareHint',
                  )}
                </p>

                <label className="speaking-field">
                  <span>{t('speaking.topicLabel')}</span>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    disabled={topics.length === 0}
                  >
                    {topics.length === 0 ? (
                      <option value="">{t('speaking.noTopics')}</option>
                    ) : (
                      topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({formatClock(t.durationSeconds)})
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <div className="speaking-mic-row">
                  <span className="speaking-mic-label">Microphone</span>
                  <span
                    className={`speaking-mic-status ${
                      micOk === true ? 'is-ok' : micOk === false ? 'is-bad' : 'is-pending'
                    }`}
                  >
                    {micOk === true
                      ? t('speaking.micReady')
                      : micOk === false
                        ? t('speaking.micDeniedShort')
                        : t('speaking.micUnchecked')}
                  </span>
                </div>
              </div>

              <div className="speaking-actions">
                <button type="button" className="admin-btn speaking-btn" onClick={() => void checkMic()}>
                  <i className="fas fa-microphone" aria-hidden="true" />
                  {micOk === true ? t('speaking.micOkRecheck') : micOk === false ? t('speaking.micRetry') : t('speaking.micCheck')}
                </button>
                <button
                  type="button"
                  className="admin-btn primary speaking-btn"
                  disabled={
                    !selectedTopic ||
                    (!previewSessionId &&
                      !usage.canStart &&
                      !isRealtimeSessionReusable(usage.session))
                  }
                  onClick={() => void startPractice()}
                >
                  <i className="fas fa-play" aria-hidden="true" />
                  {previewSessionId ? t('speaking.startPreview') : t('speaking.startPractice')}
                </button>
              </div>
            </div>
          ) : null}

          {phase === 'blocked' && usage ? (
            <div className="speaking-blocked">
              <div className="speaking-banner speaking-banner--warn">
                <i className="fas fa-hourglass-end" aria-hidden="true" />
                <div>
                  <strong>{t('speaking.outOfTurns')}</strong>
                  <p>
                    {usage.nextAvailableAt
                      ? t('speaking.nextAvailable', { when: new Date(usage.nextAvailableAt).toLocaleString(numberLocale) })
                      : t('speaking.comeBackTomorrow')}
                  </p>
                  {usage.session?.topic ? (
                    <p>
                      {t('speaking.lastSession')} <strong>{usage.session.topic.title}</strong>
                    </p>
                  ) : null}
                </div>
              </div>

              <SpeakingChatFrame
                chatRef={chatRef}
                transcript={transcript}
                emptyLabel={t('speaking.emptyTranscriptToday')}
              />

              <div className="speaking-actions">
                {usage.session?.recordingUrl ? (
                  <a
                    className="admin-btn speaking-btn"
                    href={usage.session.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fas fa-headphones" aria-hidden="true" />
                    {t('speaking.listenRecording')}
                  </a>
                ) : null}
                <Link className="admin-btn primary speaking-btn" href={hubPath}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  {t('speaking.backToSpeakingHub')}
                </Link>
              </div>
            </div>
          ) : null}

          {isLive ? (
            <div className="speaking-live">
              <div className="speaking-live-status" aria-live="polite">
                <span
                  className={`speaking-live-dot ${
                    phase === 'active'
                      ? pttHeld
                        ? 'is-live'
                        : aiTalking
                          ? 'is-saving'
                          : 'is-live'
                      : phase === 'finishing'
                        ? 'is-saving'
                        : 'is-connecting'
                  }`}
                />
                {phase === 'connecting'
                  ? t('speaking.connectingAi')
                  : phase === 'finishing'
                    ? t('speaking.savingSession')
                    : pttHeld
                      ? t('speaking.pttHolding')
                      : aiTalking
                        ? t('speaking.pttWaitAi')
                        : t('speaking.inConversation')}
              </div>

              <SpeakingChatFrame
                chatRef={chatRef}
                transcript={transcript}
                emptyLabel={
                  phase === 'connecting'
                    ? t('speaking.transcriptConnecting')
                    : t('speaking.transcriptWaiting')
                }
              />

              <div className="speaking-actions speaking-actions--live">
                {phase === 'active' ? (
                  <>
                    <button
                      type="button"
                      className={`speaking-ptt-btn${pttHeld ? ' is-held' : ''}${aiTalking && !pttHeld ? ' is-waiting' : ''}`}
                      aria-pressed={pttHeld}
                      aria-label={t('speaking.pttAria')}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {
                          /* ignore */
                        }
                        beginPushToTalk();
                      }}
                      onPointerUp={(e) => {
                        e.preventDefault();
                        endPushToTalk();
                      }}
                      onPointerCancel={() => {
                        endPushToTalk();
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <i
                        className={`fas ${pttHeld ? 'fa-microphone' : 'fa-microphone-lines'}`}
                        aria-hidden="true"
                      />
                      <span>
                        {pttHeld ? t('speaking.pttRelease') : t('speaking.pttHold')}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger speaking-btn"
                      onClick={() => sessionId && void finishSession(sessionId, 'manual')}
                    >
                      <i className="fas fa-stop" aria-hidden="true" />
                      {t('speaking.endEarly')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="admin-btn speaking-btn" disabled>
                    <i className="fas fa-gear fa-spin" aria-hidden="true" />
                    {phase === 'finishing' ? t('speaking.savingData') : t('common.loading')}
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {phase === 'done' ? (
            <div className="speaking-done">
              <div className="speaking-banner speaking-banner--success">
                <i className="fas fa-circle-check" aria-hidden="true" />
                <div>
                  <strong>{t('speaking.sessionSaved')}</strong>
                  <p>{t('speaking.sessionSavedHint')}</p>
                </div>
              </div>

              {showChat ? (
                <SpeakingChatFrame
                  chatRef={chatRef}
                  transcript={transcript}
                  emptyLabel={t('speaking.emptyTranscriptSaved')}
                />
              ) : null}

              <div className="speaking-actions">
                <button type="button" className="admin-btn speaking-btn" onClick={() => void load()}>
                  <i className="fas fa-rotate" aria-hidden="true" />
                  {t('speaking.reviewStatus')}
                </button>
                <Link className="admin-btn primary speaking-btn" href={hubPath}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  {t('speaking.backToSpeakingHub')}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SpeakingChatFrame({
  chatRef,
  transcript,
  emptyLabel,
}: {
  chatRef: RefObject<HTMLDivElement | null>;
  transcript: TranscriptLine[];
  emptyLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div className="speaking-chat-frame">
      <div className="speaking-chat-toolbar">
        <span>
          <i className="fas fa-comments" aria-hidden="true" /> {t('speaking.conversation')}
        </span>
        <span className="speaking-chat-count">
          {t('speaking.turnCount', { count: transcript.length })}
        </span>
      </div>
      <div className="speaking-chat" ref={chatRef} role="log" aria-live="polite">
        {transcript.length === 0 ? (
          <div className="speaking-chat-empty">{emptyLabel}</div>
        ) : (
          transcript.map((line, i) => (
            <div
              key={`${line.at}-${i}`}
              className={`speaking-bubble speaking-bubble--${line.role === 'assistant' ? 'ai' : 'user'}`}
            >
              <span className="speaking-bubble-role">
                {line.role === 'assistant' ? 'AI' : t('common.you')}
              </span>
              <p className="speaking-bubble-text">{line.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function normalizeTranscript(raw: unknown): TranscriptLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { role?: string; text?: string; at?: number };
      if ((row.role !== 'user' && row.role !== 'assistant') || !row.text) return null;
      return { role: row.role, text: String(row.text), at: Number(row.at) || Date.now() };
    })
    .filter(Boolean) as TranscriptLine[];
}
