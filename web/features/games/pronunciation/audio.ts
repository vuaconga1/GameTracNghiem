export function speakText(text: string, rate = 1.0): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
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
  onActiveAudio(audio);
  audio.play().catch(() => {
    speakText(targetText, rate);
  });
}
