import { setAiSpeaking } from '@/lib/audio/echoGate';

/** Speak English text via browser Speech Synthesis (instant vocab feedback). */
export function speakEnglish(text: string, rate = 0.95): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const synth =
    typeof globalThis !== 'undefined'
      ? (globalThis as typeof globalThis & { speechSynthesis?: SpeechSynthesis }).speechSynthesis
      : undefined;
  const UtteranceCtor =
    typeof globalThis !== 'undefined'
      ? (globalThis as typeof globalThis & {
          SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
        }).SpeechSynthesisUtterance
      : undefined;
  if (!synth || !UtteranceCtor) return;

  synth.cancel();
  const utterance = new UtteranceCtor(trimmed);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.onstart = () => setAiSpeaking(true);
  utterance.onend = () => setAiSpeaking(false);
  utterance.onerror = () => setAiSpeaking(false);
  synth.speak(utterance);
}
