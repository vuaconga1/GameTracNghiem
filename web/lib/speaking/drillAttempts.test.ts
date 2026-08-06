import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => {
  const state = {
    quota: {
      id: 'quota-1',
      usageDateVN: new Date('2026-08-06T00:00:00.000Z'),
      usedCount: 0,
      reservedCount: 1,
      limitSnapshot: 30,
      sessionId: 'session-1' as string | null,
      reservedUntil: new Date('2026-08-06T04:02:00.000Z') as Date | null,
    },
    session: {
      id: 'session-1',
      quotaUsageId: 'quota-1',
      usageCountedAt: null as Date | null,
      status: 'RESERVED',
      startedAt: null as Date | null,
    },
    attempt: {
      id: 'attempt-1',
      userId: 'student-1',
      courseId: 'course-1',
      questionId: 'question-1',
      activityType: 'WORD_PRONUNCIATION',
      sessionId: 'session-1',
      status: 'PROCESSING',
      scoreLogId: null as string | null,
      createdAt: new Date('2026-08-06T04:00:00.000Z'),
      failedAt: null as Date | null,
      failureCode: null as string | null,
    },
    scoreLog: null as null | {
      id: string;
      isCorrect: boolean;
      points: number;
    },
  };

  const client = {
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(
      async (callback: (tx: typeof client) => Promise<unknown>) =>
        callback(client),
    ),
    dailySpeakingUsage: {
      findUnique: vi.fn(async () => state.quota),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        Object.assign(state.quota, args.data);
        return state.quota;
      }),
    },
    speakingAttempt: {
      findUnique: vi.fn(async () => ({
        ...state.attempt,
        session: { ...state.session },
        course: { name: 'Unit 1', levelName: 'Lớp 8' },
        question: { sortOrder: 4 },
        scoreLog: state.scoreLog,
      })),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        Object.assign(state.attempt, args.data);
        return { ...state.attempt, scoreLog: state.scoreLog };
      }),
    },
    scoreLog: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.scoreLog = {
          id: 'score-log-1',
          isCorrect: Boolean(args.data.isCorrect),
          points: Number(args.data.points),
        };
        return state.scoreLog;
      }),
    },
    speakingSession: {
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        Object.assign(state.session, args.data);
        return state.session;
      }),
    },
  };

  function reset() {
    Object.assign(state.quota, {
      usedCount: 0,
      reservedCount: 1,
      sessionId: 'session-1',
      reservedUntil: new Date('2026-08-06T04:02:00.000Z'),
    });
    Object.assign(state.session, {
      quotaUsageId: 'quota-1',
      usageCountedAt: null,
      status: 'RESERVED',
    });
    Object.assign(state.attempt, {
      status: 'PROCESSING',
      scoreLogId: null,
      failedAt: null,
      failureCode: null,
    });
    state.scoreLog = null;
  }

  return { client, state, reset };
});

vi.mock('@/lib/db', () => ({ prisma: harness.client }));

import {
  completeSpeakingDrillAttempt,
  failSpeakingDrillAttempt,
} from '@/lib/speaking/drillAttempts';

describe('short-drill practice score completion', () => {
  beforeEach(() => {
    harness.reset();
    vi.clearAllMocks();
  });

  it('consumes quota and creates one linked practice ScoreLog atomically', async () => {
    const first = await completeSpeakingDrillAttempt({
      attemptId: 'attempt-1',
      userId: 'student-1',
      transcript: 'hello',
      score: 90,
      details: {},
      feedback: {},
      audioMimeType: 'audio/webm',
      audioBytes: 1_024,
      audioDurationMs: 1_500,
      model: 'test-model',
      now: new Date('2026-08-06T04:01:00.000Z'),
    });

    expect(first.idempotent).toBe(false);
    expect(harness.state.quota).toMatchObject({
      usedCount: 1,
      reservedCount: 0,
    });
    expect(harness.client.scoreLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'student-1',
        course: 'Unit 1|Lớp 8',
        game: 'speaking_drill',
        questionIndex: 4,
        isCorrect: true,
        elapsedMs: 1_500,
        points: 193,
        countsForCourseTotal: false,
      },
    });
    expect(harness.state.attempt).toMatchObject({
      status: 'COMPLETED',
      scoreLogId: 'score-log-1',
    });
    expect(harness.client.$transaction).toHaveBeenCalledTimes(1);

    const retry = await completeSpeakingDrillAttempt({
      attemptId: 'attempt-1',
      userId: 'student-1',
      transcript: 'hello',
      score: 90,
      details: {},
      feedback: {},
      audioMimeType: 'audio/webm',
      audioBytes: 1_024,
      audioDurationMs: 1_500,
      model: 'test-model',
    });

    expect(retry.idempotent).toBe(true);
    expect(harness.client.scoreLog.create).toHaveBeenCalledTimes(1);
    expect(harness.state.quota.usedCount).toBe(1);
  });
});

describe('short-drill quota release', () => {
  beforeEach(() => {
    harness.reset();
    vi.clearAllMocks();
  });

  it('releases one reservation without consuming quota and is repeat-safe', async () => {
    const first = await failSpeakingDrillAttempt({
      attemptId: 'attempt-1',
      userId: 'student-1',
      failureCode: 'TRANSCRIPTION_FAILED',
      now: new Date('2026-08-06T04:01:00.000Z'),
    });

    expect(first).toEqual({ released: true });
    expect(harness.state.quota).toMatchObject({
      usedCount: 0,
      reservedCount: 0,
      sessionId: null,
      reservedUntil: null,
    });
    expect(harness.state.attempt).toMatchObject({
      status: 'FAILED',
      failureCode: 'TRANSCRIPTION_FAILED',
    });
    expect(harness.state.session).toMatchObject({
      status: 'FAILED',
      usageCountedAt: null,
    });

    const retry = await failSpeakingDrillAttempt({
      attemptId: 'attempt-1',
      userId: 'student-1',
      failureCode: 'TRANSCRIPTION_FAILED',
    });
    expect(retry).toEqual({ released: false });
    expect(harness.client.dailySpeakingUsage.update).toHaveBeenCalledTimes(1);
  });
});
