import { bindAiSpeakingAudio, setAiSpeaking } from '@/lib/audio/echoGate';

/** Prefer clear US/UK English system voices when the browser exposes them. */
export function pickEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const rank = (voice: SpeechSynthesisVoice): number => {
    const lang = String(voice.lang || '').toLowerCase();
    const name = String(voice.name || '').toLowerCase();
    let score = 0;
    if (lang === 'en-us') score += 40;
    else if (lang.startsWith('en-us')) score += 35;
    else if (lang === 'en-gb') score += 30;
    else if (lang.startsWith('en-gb')) score += 28;
    else if (lang.startsWith('en')) score += 20;
    else return -1;

    if (/google|microsoft|natural|neural|premium|enhanced/.test(name)) score += 15;
    if (/samantha|jenny|aria|guy|davis|zira|susan|daniel|karen|moira/.test(name)) {
      score += 8;
    }
    if (voice.localService) score += 2;
    return score;
  };

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = rank(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

export function speakText(text: string, rate = 1.0): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const value = String(text || '').trim();
  if (!value) return;

  window.speechSynthesis.cancel();

  let started = false;
  const run = () => {
    if (started) return;
    started = true;

    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = 'en-US';
    utterance.rate = Math.min(1.2, Math.max(0.6, rate));
    utterance.pitch = 1;
    const voice = pickEnglishVoice(window.speechSynthesis.getVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-US';
    }
    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => setAiSpeaking(false);
    utterance.onerror = () => setAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    run();
    return;
  }

  // Chrome often loads voices asynchronously.
  window.speechSynthesis.addEventListener('voiceschanged', run, { once: true });
  window.setTimeout(run, 250);
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
    { once: true },
  );
  onActiveAudio(audio);
  audio.play().catch(() => {
    unbind();
    speakText(targetText, rate);
  });
}
