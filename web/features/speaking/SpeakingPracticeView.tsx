'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';

import { DataLoading } from '@/components/DataLoading';
import { PageBackButton } from '@/components/PageBackButton';

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

type TranscriptLine = {
  role: 'user' | 'assistant';
  text: string;
  at: number;
};

type Phase = 'loading' | 'prepare' | 'connecting' | 'active' | 'finishing' | 'done' | 'blocked' | 'error';

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function isAiAudioStartEvent(type: string) {
  return (
    type === 'output_audio_buffer.started' ||
    type === 'response.output_audio.delta' ||
    type === 'response.audio.delta'
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
  const chatRef = useRef<HTMLDivElement | null>(null);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) || null;
  const isLive = phase === 'connecting' || phase === 'active' || phase === 'finishing';
  const showChat = isLive || phase === 'blocked' || phase === 'done';
  const headerSubtitle =
    selectedTopic?.title ||
    usage?.session?.topic?.title ||
    courseName ||
    'Luyện nói với AI';

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
        throw new Error(topicsJson.message || 'Không tải được topic');
      }
      if (!usageRes.ok || !usageJson.success) {
        throw new Error(usageJson.message || 'Không tải được lượt Speaking');
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
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
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
  }

  async function checkMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicOk(true);
      setError('');
    } catch {
      setMicOk(false);
      setError('Không truy cập được microphone. Hãy cho phép mic trong trình duyệt.');
    }
  }

  async function markStarted(id: string) {
    if (startedSentRef.current) return;
    startedSentRef.current = true;
    try {
      await fetch(`/api/speaking/sessions/${id}/started`, { method: 'POST' });
      setStatusNote('Đã bắt đầu — lượt hôm nay đã được tính');
    } catch {
      /* keep trying state; server is source of truth on reload */
    }
  }

  function appendTranscript(role: 'user' | 'assistant', text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      let next: TranscriptLine[];
      if (last && last.role === role) {
        next = [...prev.slice(0, -1), { ...last, text: `${last.text} ${trimmed}`.trim() }];
      } else {
        next = [...prev, { role, text: trimmed, at: Date.now() }];
      }
      transcriptRef.current = next;
      return next;
    });
  }

  function handleRealtimeEvent(raw: string, id: string) {
    let event: { type?: string; transcript?: string; delta?: string; item?: { role?: string } };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    const type = String(event.type || '');
    if (isAiAudioStartEvent(type)) {
      void markStarted(id);
    }
    if (
      type === 'response.output_audio_transcript.delta' ||
      type === 'response.audio_transcript.delta'
    ) {
      appendTranscript('assistant', String(event.delta || ''));
    }
    if (
      type === 'conversation.item.input_audio_transcription.completed' ||
      type === 'conversation.item.input_audio_transcription.delta'
    ) {
      const text = String(event.transcript || event.delta || '');
      // Drop non-English-script filler when model mis-detects language.
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
      setStatusNote('Không ghi được bản ghi hỗn hợp — phiên vẫn tiếp tục');
    }
  }

  async function finishSession(id: string, reason: 'time' | 'manual' | 'error') {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase('finishing');
    setStatusNote(reason === 'time' ? 'Hết giờ — đang lưu phiên' : 'Đang kết thúc phiên');

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
          errorMessage: reason === 'error' ? error || 'Lỗi trước khi AI phát' : 'Hủy trước khi bắt đầu',
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
      setError('Hãy kiểm tra microphone trước khi bắt đầu');
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
        ? 'Admin preview — không trừ lượt học sinh…'
        : 'Đang giữ lượt và kết nối AI…'
    );
    startedSentRef.current = false;
    finishingRef.current = false;
    setTranscript([]);
    transcriptRef.current = [];

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
          throw new Error(createJson.message || 'Không tạo được phiên');
        }

        createdId = createJson.session.id as string;
        setSessionId(createdId);
        durationRef.current = createJson.topic.durationSeconds || selectedTopic.durationSeconds;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
              instructions:
                'Chào học sinh bằng tiếng Anh ngắn gọn, rồi dẫn dắt hội thoại theo hướng dẫn phiên.',
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
        throw new Error('Trình duyệt không tạo được SDP offer hợp lệ');
      }

      // Server mints ephemeral OpenAI credential (master key stays server-side).
      const credRes = await fetch(`/api/speaking/sessions/${createdId}/realtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const credJson = await credRes.json().catch(() => ({}));
      if (!credRes.ok || !credJson.success || typeof credJson.clientSecret !== 'string') {
        throw new Error(credJson.message || 'Không lấy được credential Realtime');
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
        throw new Error(`OpenAI WebRTC lỗi ${sdpRes.status}: ${detail || 'SDP answer không hợp lệ'}`);
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setPhase('active');
      setStatusNote(
        previewSessionId
          ? 'Admin preview đang chạy'
          : 'Đang chờ AI chào… Lượt chỉ bị trừ khi AI bắt đầu nói'
      );
      startCountdown(durationRef.current, () => {
        if (createdId) void finishSession(createdId, 'time');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không bắt đầu được phiên';
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
        <PageBackButton href={`/courses/${courseId}?skill=speaking`} title="Quay lại" />
        <DataLoading />
      </section>
    );
  }

  return (
    <section className="view-detail speaking-practice">
      <PageBackButton href={`/courses/${courseId}?skill=speaking`} title="Quay lại" />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="speaking-shell">
        <header className="speaking-header">
          <div className="speaking-header-main">
            <div className="speaking-header-icon" aria-hidden="true">
              <i className="fas fa-comments" />
            </div>
            <div className="speaking-header-text">
              <h1>AI Speaking</h1>
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
                {usage.remainingToday}/{usage.dailyLimit} lượt
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
                <h2 className="speaking-panel-title">Chuẩn bị phiên</h2>
                <p className="speaking-panel-note">
                  Lượt bị trừ khi AI bắt đầu phát câu mở đầu. Đóng tab sau thời điểm đó vẫn mất lượt.
                </p>

                <label className="speaking-field">
                  <span>Chủ đề</span>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    disabled={topics.length === 0}
                  >
                    {topics.length === 0 ? (
                      <option value="">Chưa có topic Speaking</option>
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
                      ? 'Sẵn sàng'
                      : micOk === false
                        ? 'Chưa cấp quyền'
                        : 'Chưa kiểm tra'}
                  </span>
                </div>
              </div>

              <div className="speaking-actions">
                <button type="button" className="admin-btn speaking-btn" onClick={() => void checkMic()}>
                  <i className="fas fa-microphone" aria-hidden="true" />
                  {micOk === true ? 'Mic OK — kiểm tra lại' : micOk === false ? 'Thử lại mic' : 'Kiểm tra mic'}
                </button>
                <button
                  type="button"
                  className="admin-btn primary speaking-btn"
                  disabled={!selectedTopic || (!previewSessionId && !usage.canStart)}
                  onClick={() => void startPractice()}
                >
                  <i className="fas fa-play" aria-hidden="true" />
                  {previewSessionId ? 'Bắt đầu preview' : 'Bắt đầu luyện nói'}
                </button>
              </div>
            </div>
          ) : null}

          {phase === 'blocked' && usage ? (
            <div className="speaking-blocked">
              <div className="speaking-banner speaking-banner--warn">
                <i className="fas fa-hourglass-end" aria-hidden="true" />
                <div>
                  <strong>Đã hết lượt Speaking hôm nay</strong>
                  <p>
                    {usage.nextAvailableAt
                      ? `Lượt mới từ ${new Date(usage.nextAvailableAt).toLocaleString('vi-VN')}.`
                      : 'Quay lại vào ngày mai để luyện tiếp.'}
                  </p>
                  {usage.session?.topic ? (
                    <p>
                      Phiên gần nhất: <strong>{usage.session.topic.title}</strong>
                    </p>
                  ) : null}
                </div>
              </div>

              <SpeakingChatFrame
                chatRef={chatRef}
                transcript={transcript}
                emptyLabel="Chưa có transcript cho phiên hôm nay."
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
                    Nghe bản ghi
                  </a>
                ) : null}
                <Link className="admin-btn primary speaking-btn" href={`/courses/${courseId}?skill=speaking`}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  Về kỹ năng Speaking
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
                  ? 'Đang kết nối với AI…'
                  : phase === 'finishing'
                    ? 'Đang lưu phiên…'
                    : 'Đang hội thoại — hãy nói vào mic'}
              </div>

              <SpeakingChatFrame
                chatRef={chatRef}
                transcript={transcript}
                emptyLabel={
                  phase === 'connecting'
                    ? 'Đang kết nối — transcript sẽ hiện tại đây.'
                    : 'Đang chờ AI chào…'
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
                    Kết thúc sớm
                  </button>
                ) : (
                  <button type="button" className="admin-btn speaking-btn" disabled>
                    <i className="fas fa-gear fa-spin" aria-hidden="true" />
                    {phase === 'finishing' ? 'đang lưu dữ liệu' : 'đang tải dữ liệu'}
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
                  <strong>Đã lưu phiên Speaking</strong>
                  <p>Bạn có thể xem lại hội thoại bên dưới.</p>
                </div>
              </div>

              {showChat ? (
                <SpeakingChatFrame
                  chatRef={chatRef}
                  transcript={transcript}
                  emptyLabel="Phiên đã lưu nhưng chưa có transcript."
                />
              ) : null}

              <div className="speaking-actions">
                <button type="button" className="admin-btn speaking-btn" onClick={() => void load()}>
                  <i className="fas fa-rotate" aria-hidden="true" />
                  Xem lại trạng thái
                </button>
                <Link className="admin-btn primary speaking-btn" href={`/courses/${courseId}?skill=speaking`}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  Về kỹ năng Speaking
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
  return (
    <div className="speaking-chat-frame">
      <div className="speaking-chat-toolbar">
        <span>
          <i className="fas fa-comments" aria-hidden="true" /> Hội thoại
        </span>
        <span className="speaking-chat-count">
          {transcript.length} lượt
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
                {line.role === 'assistant' ? 'AI' : 'Bạn'}
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
