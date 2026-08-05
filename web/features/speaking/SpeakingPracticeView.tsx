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
import { SPEAKING_OPENING_INSTRUCTIONS } from '@/lib/speaking/prompts';

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
    transcript?: unknown;
    recordingUrl?: string | null;
    topic?: { id: string; title: string; durationSeconds: number } | null;
  } | null;
};

type Phase = 'loading' | 'prepare' | 'connecting' | 'active' | 'finishing' | 'done' | 'blocked' | 'error';

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
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
}: {
  courseId: string;
  courseName?: string;
  topicId?: string;
}) {
  const { t, locale } = useI18n();
  const numberLocale = locale === 'en' ? 'en-US' : 'vi-VN';

  const searchParams = useSearchParams();
  const previewSessionId = searchParams.get('previewSession');

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedSentRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(300);
  const finishingRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const seenUserTranscriptItemIdsRef = useRef<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement | null>(null);
  const aiSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Flag only — do NOT mute WebRTC mic tracks (MediaStream never "ends"). */
  function applyAiSpeaking(speaking: boolean) {
    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
      aiSpeakingTimeoutRef.current = null;
    }
    setAiSpeaking(speaking);
    // Safety: never leave STT blocked if stop event is missed.
    if (speaking) {
      aiSpeakingTimeoutRef.current = setTimeout(() => {
        setAiSpeaking(false);
        aiSpeakingTimeoutRef.current = null;
      }, 12_000);
    }
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
    try {
      const [topicsRes, usageRes] = await Promise.all([
        fetch(`/api/speaking/topics?courseId=${encodeURIComponent(courseId)}`),
        fetch('/api/speaking/daily-usage'),
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
          : list[0]?.id || '';
      setSelectedTopicId((prev) => prev || initial);

      if (!usageJson.canStart && usageJson.status === 'CONSUMED' && !previewSessionId) {
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
    applyAiSpeaking(false);
  }

  async function checkMic() {
    try {
      const stream = await openMicStream();
      stream.getTracks().forEach((t) => t.stop());
      setMicOk(true);
      setError('');
    } catch {
      setMicOk(false);
      setError(t('speaking.micDenied'));
    }
  }

  async function markStarted(id: string) {
    if (startedSentRef.current) return;
    startedSentRef.current = true;
    try {
      await fetch(`/api/speaking/sessions/${id}/started`, { method: 'POST' });
      setStatusNote(t('speaking.startedNote'));
    } catch {
      /* keep trying state; server is source of truth on reload */
    }
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
    };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    const type = String(event.type || '');
    if (isAiAudioStartEvent(type)) {
      applyAiSpeaking(true);
      void markStarted(id);
    }
    if (isAiAudioStopEvent(type)) {
      applyAiSpeaking(false);
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

  function startCountdown(seconds: number, onDone: () => void) {
    durationRef.current = seconds;
    setRemainingSec(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
        headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcriptRef.current }),
    });

    if (blob && blob.size > 0) {
      const form = new FormData();
      form.append('file', blob, `speaking-${id}.webm`);
      await fetch(`/api/speaking/sessions/${id}/recording`, { method: 'POST', body: form });
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
    if (!previewSessionId && !usage?.canStart) {
      setPhase('blocked');
      return;
    }

    setError('');
    setPhase('connecting');
    setStatusNote(
      previewSessionId
        ? t('speaking.adminPreviewConnecting')
        : t('speaking.connectingHold')
    );
    startedSentRef.current = false;
    finishingRef.current = false;
    setTranscript([]);
    transcriptRef.current = [];
    seenUserTranscriptItemIdsRef.current = new Set();

    let createdId: string | null = null;
    try {
      if (previewSessionId) {
        createdId = previewSessionId;
        setSessionId(createdId);
        durationRef.current = selectedTopic.durationSeconds;
      } else {
        const createRes = await fetch('/api/speaking/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        durationRef.current = createJson.topic.durationSeconds || selectedTopic.durationSeconds;
      }

      const stream = await openMicStream();
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      let remoteStream: MediaStream | null = null;
      pc.ontrack = (e) => {
        remoteStream = e.streams[0] || null;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        if (localStreamRef.current) {
          startMixedRecorder(localStreamRef.current, remoteStream);
        }
      };

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('open', () => {
        dc.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              instructions: SPEAKING_OPENING_INSTRUCTIONS,
            },
          })
        );
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

      // Server mints ephemeral OpenAI credential (master key stays server-side).
      const credRes = await fetch(`/api/speaking/sessions/${createdId}/realtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const credJson = await credRes.json().catch(() => ({}));
      if (!credRes.ok || !credJson.success || typeof credJson.clientSecret !== 'string') {
        throw new Error(credJson.message || t('speaking.credentialFailed'));
      }

      // Browser exchanges SDP directly with OpenAI using the short-lived secret.
      const model = encodeURIComponent(String(credJson.model || 'gpt-realtime-mini'));
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credJson.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: localSdp,
      });
      const answerSdp = await sdpRes.text();
      if (!sdpRes.ok || !answerSdp.includes('v=0')) {
        let detail = answerSdp.slice(0, 240);
        try {
          detail = JSON.parse(answerSdp)?.error?.message || detail;
        } catch {
          /* keep raw */
        }
        throw new Error(t('speaking.webrtcError', { status: sdpRes.status, detail: detail || t('speaking.invalidSdp') }));
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setPhase('active');
      setStatusNote(
        previewSessionId
          ? t('speaking.adminPreviewRunning')
          : t('speaking.waitingAiHello')
      );
      startCountdown(durationRef.current, () => {
        if (createdId) void finishSession(createdId, 'time');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('speaking.startSessionFailed');
      setError(message);
      if (createdId && !startedSentRef.current && !previewSessionId) {
        await fetch(`/api/speaking/sessions/${createdId}/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failed: true, errorMessage: message }),
        });
      }
      cleanupMedia();
      setPhase('error');
      if (!previewSessionId) await load({ silent: true });
    }
  }

  if (phase === 'loading') {
    return (
      <section className="view-detail">
        <PageBackButton href={`/courses/${courseId}?skill=speaking`} title={t('common.back')} />
        <DataLoading />
      </section>
    );
  }

  return (
    <section className="view-detail speaking-practice">
      <PageBackButton href={`/courses/${courseId}?skill=speaking`} title={t('common.back')} />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="speaking-shell">
        <header className="speaking-header">
          <div className="speaking-header-main">
            <div className="speaking-header-icon" aria-hidden="true">
              <i className="fas fa-comments" />
            </div>
            <div className="speaking-header-text">
              <h1>{t('speaking.title')}</h1>
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
          {(phase === 'prepare' || phase === 'error') && usage ? (
            <div className="speaking-prepare">
              <div className="speaking-panel">
                <h2 className="speaking-panel-title">{t('speaking.prepareTitle')}</h2>
                <p className="speaking-panel-note">
                  {t('speaking.prepareHint')}
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
                  disabled={!selectedTopic || (!previewSessionId && !usage.canStart)}
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
                <Link className="admin-btn primary speaking-btn" href={`/courses/${courseId}?skill=speaking`}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  {t('speaking.backToSpeakingSkill')}
                </Link>
              </div>
            </div>
          ) : null}

          {isLive ? (
            <div className="speaking-live">
              <div className="speaking-live-status" aria-live="polite">
                <span
                  className={`speaking-live-dot ${
                    phase === 'active' ? 'is-live' : phase === 'finishing' ? 'is-saving' : 'is-connecting'
                  }`}
                />
                {phase === 'connecting'
                  ? t('speaking.connectingAi')
                  : phase === 'finishing'
                    ? t('speaking.savingSession')
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

              <div className="speaking-actions">
                {phase === 'active' ? (
                  <button
                    type="button"
                    className="admin-btn danger speaking-btn"
                    onClick={() => sessionId && void finishSession(sessionId, 'manual')}
                  >
                    <i className="fas fa-stop" aria-hidden="true" />
                    {t('speaking.endEarly')}
                  </button>
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
                <Link className="admin-btn primary speaking-btn" href={`/courses/${courseId}?skill=speaking`}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  {t('speaking.backToSpeakingSkill')}
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
