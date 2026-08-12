import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  runSpeakingDrillPipeline,
  type PipelineDependencies,
} from '@/lib/speaking/drillPipeline';
import { DrillProcessingError } from '@/lib/speaking/drillErrors';

const authSession = {
  userId: 'student-1',
  username: 'student',
  displayName: 'Student',
  role: 'WewinStudent' as const,
};

function bytes() {
  return new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  ]);
}

function input(audioBytes = bytes()) {
  return {
    authSession,
    courseId: 'course-1',
    questionId: 'question-1',
    activityType: 'WORD_PRONUNCIATION' as const,
    idempotencyKey: 'stable-idempotency-key',
    audioBytes,
    audioMimeType: 'audio/webm',
    audioDurationMs: 1_500,
    locale: 'en' as const,
  };
}

function dependencies() {
  return {
    reserve: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn().mockResolvedValue({ released: true }),
    transcribe: vi.fn().mockResolvedValue({
      transcript: 'hello',
      model: 'gpt-4o-mini-transcribe',
    }),
    scoreGuided: vi.fn(),
    parseDuration: vi.fn().mockResolvedValue(1_500),
  };
}

function reservation() {
  return {
    kind: 'reserved' as const,
    attemptId: 'attempt-1',
    sessionId: 'session-1',
    payload: {
      kind: 'word' as const,
      targetText: 'hello',
      acceptedAnswers: [],
      sampleAnswers: [],
      keywords: [],
      hints: [],
    },
    config: {
      dailyLimit: 30,
      durationSeconds: 60,
      reservationTtlSeconds: 120,
      promptVersion: 'v1',
    },
    promptVersion: 'v1',
  };
}

describe('short-drill pipeline idempotency and quota safety', () => {
  it('returns a prior completed attempt without another costly call', async () => {
    const deps = dependencies();
    deps.reserve.mockResolvedValue({
      kind: 'completed',
      attempt: {
        id: 'attempt-existing',
        questionId: 'question-1',
        activityType: 'WORD_PRONUNCIATION',
        status: 'COMPLETED',
        transcript: 'hello',
        score: 100,
        details: {},
        feedback: {},
        isCorrect: true,
        points: 193,
        completedAt: '2026-08-06T04:00:00.000Z',
      },
    });
    const audioBytes = bytes();

    const result = await runSpeakingDrillPipeline(
      input(audioBytes),
      deps as unknown as PipelineDependencies,
    );

    expect(result.idempotent).toBe(true);
    expect(result.points).toBe(193);
    expect(result.attempt.id).toBe('attempt-existing');
    expect(deps.transcribe).not.toHaveBeenCalled();
    expect(deps.complete).not.toHaveBeenCalled();
    expect(deps.fail).not.toHaveBeenCalled();
    expect([...audioBytes]).toEqual(new Array(audioBytes.length).fill(0));
  });

  it('releases the reservation when transcription fails', async () => {
    const deps = dependencies();
    deps.reserve.mockResolvedValue(reservation());
    deps.transcribe.mockRejectedValue(
      new DrillProcessingError('TRANSCRIPTION_FAILED', 'safe failure'),
    );
    const audioBytes = bytes();

    await expect(
      runSpeakingDrillPipeline(
        input(audioBytes),
        deps as unknown as PipelineDependencies,
      ),
    ).rejects.toThrow('safe failure');

    expect(deps.fail).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
      userId: 'student-1',
      failureCode: 'TRANSCRIPTION_FAILED',
    });
    expect(deps.complete).not.toHaveBeenCalled();
    expect([...audioBytes]).toEqual(new Array(audioBytes.length).fill(0));
  });

  it('releases the reservation when atomic persistence fails', async () => {
    const deps = dependencies();
    deps.reserve.mockResolvedValue(reservation());
    deps.complete.mockRejectedValue(
      Object.assign(new Error('database unavailable'), {
        code: 'ATTEMPT_PERSIST_FAILED',
      }),
    );

    await expect(
      runSpeakingDrillPipeline(
        input(),
        deps as unknown as PipelineDependencies,
      ),
    ).rejects.toMatchObject({
      code: 'SHORT_DRILL_PROCESSING_FAILED',
      status: 503,
    });

    expect(deps.fail).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
      userId: 'student-1',
      failureCode: 'ATTEMPT_PERSIST_FAILED',
    });
  });
});
