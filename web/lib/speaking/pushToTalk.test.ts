import { describe, expect, it } from 'vitest';

import {
  pttBeginEvents,
  pttDisableVadEvent,
  pttEndEvents,
  shouldCommitPushToTalk,
  speakingRealtimeAudioInput,
} from '@/lib/speaking/pushToTalk';

describe('push-to-talk Realtime helpers', () => {
  it('disables server VAD in session audio config', () => {
    expect(speakingRealtimeAudioInput('marin').input.turn_detection).toBeNull();
    expect(pttDisableVadEvent()).toMatchObject({
      type: 'session.update',
      session: { audio: { input: { turn_detection: null } } },
    });
  });

  it('clears the buffer on press and optionally interrupts AI', () => {
    expect(pttBeginEvents()).toEqual([{ type: 'input_audio_buffer.clear' }]);
    expect(pttBeginEvents({ interruptAi: true }).map((e) => e.type)).toEqual([
      'response.cancel',
      'output_audio_buffer.clear',
      'input_audio_buffer.clear',
    ]);
  });

  it('commits audio and creates a response on release', () => {
    expect(pttEndEvents().map((e) => e.type)).toEqual([
      'input_audio_buffer.commit',
      'response.create',
    ]);
  });

  it('ignores accidental taps shorter than the minimum hold', () => {
    expect(shouldCommitPushToTalk(0)).toBe(false);
    expect(shouldCommitPushToTalk(249)).toBe(false);
    expect(shouldCommitPushToTalk(250)).toBe(true);
  });
});
