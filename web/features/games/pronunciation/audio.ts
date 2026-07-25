import { bindAiSpeakingAudio, setAiSpeaking } from '@/lib/audio/echoGate';

export function speakText(text: string, rate = 1.0): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.onstart = () => setAiSpeaking(true);
  utterance.onend = () => setAiSpeaking(false);
  utterance.onerror = () => setAiSpeaking(false);
  window.speechSynthesis.speak(utterance);
}

export function playReferenceAudio(
  targetText: string,
  referenceAudioUrl: string | undefined,
  rate: number,
  activeAudio: HTMLAudioElement | null,
  onActiveAudio: (audio: HTMLAudioElement | null) => void
): void {
  if (!referenceAudioUrl) {
    speakText(targetText, rate);
    return;
  }

  if (activeAudio) {
    activeAudio.pause();
  }

  const audio = new Audio(referenceAudioUrl);
  audio.playbackRate = rate;
  const unbind = bindAiSpeakingAudio(audio);
  audio.addEventListener(
    'ended',
    () => {
      unbind();
      onActiveAudio(null);
    },
    { once: true }
  );
  onActiveAudio(audio);
  audio.play().catch(() => {
    unbind();
    speakText(targetText, rate);
  });
}
