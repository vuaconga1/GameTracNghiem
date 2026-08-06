/** Manual turn-taking for OpenAI Realtime (no server VAD / auto-reply). */

export const SPEAKING_PTT_MIN_HOLD_MS = 250;

export function speakingRealtimeAudioInput(voice?: string) {
  return {
    input: {
      // null = push-to-talk; client commits buffer + creates response.
      turn_detection: null,
      transcription: {
        model: 'gpt-4o-mini-transcribe',
        language: 'en',
      },
    },
    output: { voice: voice || 'marin' },
  };
}

export function pttDisableVadEvent() {
  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      audio: {
        input: {
          turn_detection: null,
        },
      },
    },
  };
}

/** Sent when the student presses Hold to Speak (optionally interrupt AI). */
export function pttBeginEvents(options?: { interruptAi?: boolean }) {
  const events: Array<Record<string, unknown>> = [];
  if (options?.interruptAi) {
    events.push({ type: 'response.cancel' });
    events.push({ type: 'output_audio_buffer.clear' });
  }
  events.push({ type: 'input_audio_buffer.clear' });
  return events;
}

/** Sent when the student releases Hold to Speak. */
export function pttEndEvents() {
  return [
    { type: 'input_audio_buffer.commit' },
    { type: 'response.create' },
  ];
}

export function shouldCommitPushToTalk(heldMs: number, minHoldMs = SPEAKING_PTT_MIN_HOLD_MS) {
  return heldMs >= minHoldMs;
}
