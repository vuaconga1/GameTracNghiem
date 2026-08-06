import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => {
  const state = {
    session: {
      id: 'session-1',
      userId: 'student-1',
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      kind: 'STUDENT_PRACTICE',
      status: 'ACTIVE',
      startedAt: new Date('2026-08-06T04:00:00.000Z') as Date | null,
      endedAt: null as Date | null,
      scoreLogId: null as string | null,
      transcript: null as unknown,
    },
    scoreLog: null as null | {
      id: string;
      points: number;
    },
  };

  const client = {
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(
      async (callback: (tx: typeof client) => Promise<unknown>) =>
        callback(client),
    ),
    speakingSession: {
      findUnique: vi.fn(async () => ({
        ...state.session,
        course: { name: 'Unit 2', levelName: 'Lớp 8' },
        topic: { sortOrder: 3 },
        scoreLog: state.scoreLog,
      })),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        Object.assign(state.session, args.data);
        return state.session;
      }),
    },
    scoreLog: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.scoreLog = {
          id: 'score-log-1',
          points: Number(args.data.points),
        };
        return state.scoreLog;
      }),
    },
  };

  function reset() {
    Object.assign(state.session, {
      activityType: 'REALTIME_CONVERSATION',
      kind: 'STUDENT_PRACTICE',
      status: 'ACTIVE',
      startedAt: new Date('2026-08-06T04:00:00.000Z'),
      endedAt: null,
      scoreLogId: null,
      transcript: null,
    });
    state.scoreLog = null;
  }

  return { client, state, reset };
});

vi.mock('@/lib/db', () => ({ prisma: harness.client }));

import { finishRealtimeSpeakingSession } from '@/lib/speaking/realtimeFinish';

describe('Realtime Speaking completion score', () => {
  beforeEach(() => {
    harness.reset();
    vi.clearAllMocks();
  });

  it('creates one linked duration score and reuses it on duplicate finish', async () => {
    const now = new Date('2026-08-06T04:01:35.000Z');
    const first = await finishRealtimeSpeakingSession({
      sessionId: 'session-1',
      userId: 'student-1',
      now,
    });
    const duplicate = await finishRealtimeSpeakingSession({
      sessionId: 'session-1',
      userId: 'student-1',
      now: new Date('2026-08-06T04:02:30.000Z'),
    });

    expect(first).toMatchObject({ points: 30, scored: true });
    expect(duplicate).toMatchObject({ points: 30, scored: true });
    expect(harness.client.scoreLog.create).toHaveBeenCalledTimes(1);
    expect(harness.client.scoreLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'student-1',
        course: 'Unit 2|Lớp 8',
        game: 'speaking_realtime',
        questionIndex: 3,
        isCorrect: true,
        elapsedMs: 95_000,
        points: 30,
        countsForCourseTotal: false,
      },
    });
    expect(harness.state.session.scoreLogId).toBe('score-log-1');
    expect(harness.state.session.endedAt).toEqual(now);
  });

  it('does not score admin previews or too-short student sessions', async () => {
    harness.state.session.kind = 'ADMIN_PREVIEW';
    await expect(
      finishRealtimeSpeakingSession({
        sessionId: 'session-1',
        userId: 'student-1',
        now: new Date('2026-08-06T04:02:00.000Z'),
      }),
    ).resolves.toMatchObject({ points: 0, scored: false });

    harness.reset();
    await expect(
      finishRealtimeSpeakingSession({
        sessionId: 'session-1',
        userId: 'student-1',
        now: new Date('2026-08-06T04:00:29.999Z'),
      }),
    ).resolves.toMatchObject({ points: 0, scored: false });
    expect(harness.client.scoreLog.create).not.toHaveBeenCalled();
  });

  it('rejects a session that failed before it actually started', async () => {
    harness.state.session.status = 'RESERVED';
    harness.state.session.startedAt = null;

    await expect(
      finishRealtimeSpeakingSession({
        sessionId: 'session-1',
        userId: 'student-1',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(harness.client.scoreLog.create).not.toHaveBeenCalled();
  });
});
