/**
 * Global echo-loop gate: skip Whisper/STT while AI audio is playing through speakers.
 * Module-level (not React state) so any mic/upload path can check the same flag.
 */

export const MIC_AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

/** Global flag — true while AI TTS / remote AI audio is audible. */
export let isAiSpeaking = false;

type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();

export function setAiSpeaking(speaking: boolean) {
  if (isAiSpeaking === speaking) return;
  isAiSpeaking = speaking;
  for (const listener of listeners) {
    try {
      listener(speaking);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function subscribeAiSpeaking(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Guard for Whisper / STT upload paths — do not spend tokens on AI echo. */
export function canSendAudioToWhisper(): boolean {
  return !isAiSpeaking;
}

export async function openMicStream(
  constraints: MediaStreamConstraints = MIC_AUDIO_CONSTRAINTS
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ ghi âm');
  }
  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Bind HTMLAudioElement playback to the global echo gate.
 * Also returns cleanup. Prefer this for &lt;audio&gt; / `new Audio()` TTS playback.
 */
export function bindAiSpeakingAudio(audio: HTMLAudioElement): () => void {
  const onStart = () => setAiSpeaking(true);
  const onEnd = () => setAiSpeaking(false);

  audio.addEventListener('play', onStart);
  audio.addEventListener('playing', onStart);
  audio.addEventListener('ended', onEnd);
  audio.addEventListener('pause', onEnd);
  audio.addEventListener('emptied', onEnd);
  audio.addEventListener('error', onEnd);

  return () => {
    audio.removeEventListener('play', onStart);
    audio.removeEventListener('playing', onStart);
    audio.removeEventListener('ended', onEnd);
    audio.removeEventListener('pause', onEnd);
    audio.removeEventListener('emptied', onEnd);
    audio.removeEventListener('error', onEnd);
    setAiSpeaking(false);
  };
}
