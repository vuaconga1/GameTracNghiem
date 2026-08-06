import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildSpeakingAnalyticsEnvelope,
  trackSpeakingEvent,
} from '@/lib/speaking/analytics';

describe('PII-safe Speaking analytics', () => {
  it('hashes identifiers and drops transcript/audio/name/email/token fields', () => {
    const envelope = buildSpeakingAnalyticsEnvelope({
      event: 'attempt_completed',
      actorId: 'student-database-id',
      sessionId: 'session-1',
      attemptId: 'attempt-1',
      properties: {
        activityType: 'WORD_PRONUNCIATION',
        model: 'gpt-4o-mini-transcribe',
        inputTokens: 12,
        transcript: 'my private transcript',
        audio: 'raw bytes',
        displayName: 'Student Name',
        email: 'student@example.com',
        token: 'secret',
      },
    });
    const serialized = JSON.stringify(envelope);
    expect(envelope.actorRef).toHaveLength(20);
    expect(envelope.properties).toEqual({
      activityType: 'WORD_PRONUNCIATION',
      model: 'gpt-4o-mini-transcribe',
      inputTokens: 12,
    });
    expect(serialized).not.toMatch(
      /student-database-id|private transcript|raw bytes|Student Name|student@example|secret/,
    );
  });

  it('emits only the redacted envelope to the adapter sink', () => {
    const sink = vi.fn();
    trackSpeakingEvent(
      {
        event: 'operation_failed',
        actorId: 'student-1',
        properties: {
          stage: 'SHORT_DRILL',
          reason: 'TRANSCRIPTION_FAILED',
          transcript: 'must not leak',
        },
      },
      sink,
    );
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'operation_failed',
        properties: {
          stage: 'SHORT_DRILL',
          reason: 'TRANSCRIPTION_FAILED',
        },
      }),
    );
  });
});
