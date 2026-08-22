import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

type TopicRow = {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  durationSeconds: number;
  active: boolean;
  archivedAt: Date | null;
};

type QuotaRow = {
  id: string;
  userId: string;
  usageDateVN: Date;
  activityType: string;
  usedCount: number;
  reservedCount: number;
  limitSnapshot: number;
  usageDate: Date;
  status: string;
  sessionId: string | null;
  reservedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRow = {
  id: string;
  userId: string;
  courseId: string;
  topicId: string | null;
  activityType: string;
  kind: string;
  status: string;
  reservationExpiresAt: Date | null;
  mustEndAt: Date | null;
  startIdempotencyKey: string | null;
  configSnapshot: unknown;
  model: string | null;
  quotaUsageId: string | null;
  usageCountedAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  failedAt: Date | null;
  failureStage: string | null;
  failureCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReleaseRow = Record<string, unknown> & { id: string; sessionId: string };
type EndJobRow = {
  id: string;
  sessionId: string;
  dueAt: Date;
  status: string;
};

const harness = vi.hoisted(() => {
  const state = {
    topics: [] as TopicRow[],
    quotas: [] as QuotaRow[],
    sessions: [] as SessionRow[],
    releases: [] as ReleaseRow[],
    endJobs: [] as EndJobRow[],
    nextQuota: 1,
    nextSession: 1,
    nextRelease: 1,
    transactionTail: Promise.resolve() as Promise<void>,
    config: {
      activityType: 'REALTIME_CONVERSATION',
      enabled: true,
      dailyLimit: 2,
      durationSeconds: 180,
      reservationTtlSeconds: 120,
      promptVersion: 'v1',
    },
  };

  function nestedRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  function statusMatches(status: string, condition: unknown) {
    if (typeof condition === 'string') return status === condition;
    const record = nestedRecord(condition);
    const values = Array.isArray(record.in) ? record.in : [];
    return values.length === 0 || values.includes(status);
  }

  function sessionMatches(row: SessionRow, whereValue: unknown): boolean {
    const where = nestedRecord(whereValue);
    if (typeof where.id === 'string' && row.id !== where.id) return false;
    if (where.id && typeof where.id === 'object') {
      const ids = nestedRecord(where.id).in;
      if (Array.isArray(ids) && !ids.includes(row.id)) return false;
    }
    if (typeof where.userId === 'string' && row.userId !== where.userId) return false;
    if (
      typeof where.activityType === 'string' &&
      row.activityType !== where.activityType
    ) {
      return false;
    }
    if (typeof where.kind === 'string' && row.kind !== where.kind) return false;
    if (where.status && !statusMatches(row.status, where.status)) return false;
    if (where.reservationExpiresAt) {
      const lte = nestedRecord(where.reservationExpiresAt).lte;
      if (
        !(lte instanceof Date) ||
        !row.reservationExpiresAt ||
        row.reservationExpiresAt.getTime() > lte.getTime()
      ) {
        return false;
      }
    }
    if (where.mustEndAt) {
      const lte = nestedRecord(where.mustEndAt).lte;
      if (
        !(lte instanceof Date) ||
        !row.mustEndAt ||
        row.mustEndAt.getTime() > lte.getTime()
      ) {
        return false;
      }
    }
    if (where.usageCountedAt) {
      const not = nestedRecord(where.usageCountedAt).not;
      if (not === null && row.usageCountedAt === null) return false;
    }
    if (Array.isArray(where.OR)) {
      if (!where.OR.some((part) => sessionMatches(row, part))) return false;
    }
    if (where.usageReleases) {
      const hasRelease = state.releases.some(
        (release) => release.sessionId === row.id,
      );
      if ('none' in nestedRecord(where.usageReleases) && hasRelease) return false;
    }
    return true;
  }

  function reset() {
    state.topics.splice(0, state.topics.length, {
      id: 'topic-1',
      courseId: 'course-1',
      title: 'Topic',
      instructions: 'Talk.',
      durationSeconds: 300,
      active: true,
      archivedAt: null,
    });
    state.quotas.splice(0);
    state.sessions.splice(0);
    state.releases.splice(0);
    state.endJobs.splice(0);
    state.nextQuota = 1;
    state.nextSession = 1;
    state.nextRelease = 1;
    state.transactionTail = Promise.resolve();
    Object.assign(state.config, {
      enabled: true,
      dailyLimit: 2,
      durationSeconds: 180,
      reservationTtlSeconds: 120,
      promptVersion: 'v1',
    });
  }

  const client = {
    user: {
      findUnique: vi.fn(async () => ({
        role: 'WewinStudent',
        archivedAt: null,
        portalLinkedAt: new Date('2026-08-01T00:00:00.000Z'),
        speakingAccountStatus: 'ACTIVE',
      })),
    },
    course: {
      findUnique: vi.fn(async () => ({
        active: true,
        archivedAt: null,
        enabledSkills: ['speaking'],
      })),
    },
    speakingEntitlement: {
      findMany: vi.fn(async () => [
        {
          status: 'ACTIVE',
          startsAt: new Date('2026-08-01T00:00:00.000Z'),
          expiresAt: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]),
    },
    speakingActivityConfig: {
      findUnique: vi.fn(async () => ({ ...state.config })),
    },
    speakingTopic: {
      findUnique: vi.fn(async (args: DbArgs) => {
        const id = nestedRecord(args.where).id;
        return state.topics.find((topic) => topic.id === id) ?? null;
      }),
      findFirst: vi.fn(async (args: DbArgs) => {
        const where = nestedRecord(args.where);
        return (
          state.topics.find(
            (topic) =>
              (!where.id || topic.id === where.id) &&
              (!where.courseId || topic.courseId === where.courseId) &&
              (!('active' in where) || topic.active === where.active) &&
              (!('archivedAt' in where) || topic.archivedAt === where.archivedAt),
          ) ?? null
        );
      }),
    },
    dailySpeakingUsage: {
      findUnique: vi.fn(async (args: DbArgs) => {
        const where = nestedRecord(args.where);
        if (typeof where.id === 'string') {
          return state.quotas.find((quota) => quota.id === where.id) ?? null;
        }
        const key = nestedRecord(where.userId_usageDateVN_activityType);
        return (
          state.quotas.find(
            (quota) =>
              quota.userId === key.userId &&
              quota.activityType === key.activityType &&
              key.usageDateVN instanceof Date &&
              quota.usageDateVN.getTime() === key.usageDateVN.getTime(),
          ) ?? null
        );
      }),
      create: vi.fn(async (args: DbArgs) => {
        const data = nestedRecord(args.data);
        const now = new Date();
        const row: QuotaRow = {
          id: `quota-${state.nextQuota++}`,
          userId: String(data.userId),
          usageDateVN: data.usageDateVN as Date,
          activityType: String(data.activityType),
          usedCount: Number(data.usedCount ?? 0),
          reservedCount: Number(data.reservedCount ?? 0),
          limitSnapshot: Number(data.limitSnapshot),
          usageDate: data.usageDate as Date,
          status: String(data.status),
          sessionId: null,
          reservedUntil: null,
          createdAt: now,
          updatedAt: now,
        };
        state.quotas.push(row);
        return row;
      }),
      update: vi.fn(async (args: DbArgs) => {
        const where = nestedRecord(args.where);
        const row = state.quotas.find((quota) => quota.id === where.id);
        if (!row) throw new Error('quota missing');
        Object.assign(row, nestedRecord(args.data), { updatedAt: new Date() });
        return row;
      }),
    },
    speakingSession: {
      findUnique: vi.fn(async (args: DbArgs) => {
        const id = nestedRecord(args.where).id;
        return state.sessions.find((session) => session.id === id) ?? null;
      }),
      findMany: vi.fn(async (args: DbArgs) =>
        state.sessions.filter((session) => sessionMatches(session, args.where)),
      ),
      findFirst: vi.fn(async (args: DbArgs) => {
        const matches = state.sessions.filter((session) =>
          sessionMatches(session, args.where),
        );
        if (nestedRecord(args.orderBy).usageCountedAt === 'desc') {
          matches.sort(
            (left, right) =>
              (right.usageCountedAt?.getTime() ?? 0) -
              (left.usageCountedAt?.getTime() ?? 0),
          );
        }
        return matches[0] ?? null;
      }),
      create: vi.fn(async (args: DbArgs) => {
        const data = nestedRecord(args.data);
        const now = new Date();
        const row: SessionRow = {
          id: `session-${state.nextSession++}`,
          userId: String(data.userId),
          courseId: String(data.courseId),
          topicId: typeof data.topicId === 'string' ? data.topicId : null,
          activityType: String(data.activityType),
          kind: String(data.kind),
          status: String(data.status),
          reservationExpiresAt:
            data.reservationExpiresAt instanceof Date
              ? data.reservationExpiresAt
              : null,
          mustEndAt: null,
          startIdempotencyKey: null,
          configSnapshot: data.configSnapshot ?? null,
          model: typeof data.model === 'string' ? data.model : null,
          quotaUsageId:
            typeof data.quotaUsageId === 'string' ? data.quotaUsageId : null,
          usageCountedAt: null,
          startedAt: null,
          endedAt: null,
          failedAt: null,
          failureStage: null,
          failureCode: null,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        };
        state.sessions.push(row);
        return row;
      }),
      update: vi.fn(async (args: DbArgs) => {
        const where = nestedRecord(args.where);
        const row = state.sessions.find((session) => session.id === where.id);
        if (!row) throw new Error('session missing');
        Object.assign(row, nestedRecord(args.data), { updatedAt: new Date() });
        return row;
      }),
      updateMany: vi.fn(async (args: DbArgs) => {
        const rows = state.sessions.filter((session) =>
          sessionMatches(session, args.where),
        );
        for (const row of rows) {
          Object.assign(row, nestedRecord(args.data), { updatedAt: new Date() });
        }
        return { count: rows.length };
      }),
    },
    speakingSessionEndJob: {
      upsert: vi.fn(async (
        args: DbArgs & {
          create?: Record<string, unknown>;
          update?: Record<string, unknown>;
        },
      ) => {
        const where = nestedRecord(args.where);
        const existing = state.endJobs.find(
          (job) => job.sessionId === where.sessionId,
        );
        const data = existing
          ? nestedRecord(args.update)
          : nestedRecord(args.create);
        if (existing) {
          Object.assign(existing, data);
          return existing;
        }
        const row: EndJobRow = {
          id: `end-job-${state.endJobs.length + 1}`,
          sessionId: String(data.sessionId),
          dueAt: data.dueAt as Date,
          status: String(data.status),
        };
        state.endJobs.push(row);
        return row;
      }),
    },
    dailySpeakingUsageRelease: {
      create: vi.fn(async (args: DbArgs) => {
        const data = nestedRecord(args.data);
        const row: ReleaseRow = {
          ...data,
          id: `release-${state.nextRelease++}`,
          sessionId: String(data.sessionId),
        };
        state.releases.push(row);
        return row;
      }),
    },
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const previous = state.transactionTail;
      let unlock = () => {};
      state.transactionTail = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      await previous;
      try {
        return await callback(client);
      } finally {
        unlock();
      }
    }),
  };

  reset();
  return { state, client, reset };
});

vi.mock('@/lib/db', () => ({ prisma: harness.client }));

import {
  SpeakingConflictError,
  SpeakingLimitError,
  finalizeActivityAttempt,
  releaseDailyUsage,
  reserveActivityAttempt,
} from '@/lib/speaking/usage';

const authSession = {
  userId: 'student-1',
  username: 'student',
  displayName: 'Student',
  role: 'WewinStudent' as const,
};
const now = new Date('2026-08-06T03:00:00.000Z');

async function reserve(at: Date = now) {
  return reserveActivityAttempt({
    userId: authSession.userId,
    courseId: 'course-1',
    topicId: 'topic-1',
    activityType: 'REALTIME_CONVERSATION',
    now: at,
  });
}

async function start(sessionId: string, key: string, at: Date = now) {
  return finalizeActivityAttempt({
    sessionId,
    userId: authSession.userId,
    authSession,
    idempotencyKey: key,
    now: at,
  });
}

function submit(sessionId: string) {
  const session = harness.state.sessions.find((row) => row.id === sessionId);
  if (!session) throw new Error('session missing');
  session.status = 'SUBMITTED';
  session.endedAt = new Date();
}

describe('Speaking quota V2', () => {
  beforeEach(() => {
    harness.reset();
    vi.clearAllMocks();
    harness.client.user.findUnique.mockResolvedValue({
      role: 'WewinStudent',
      archivedAt: null,
      portalLinkedAt: new Date('2026-08-01T00:00:00.000Z'),
      speakingAccountStatus: 'ACTIVE',
    });
  });

  it('allows the first and second starts, then rejects the third', async () => {
    const first = await reserve();
    expect(first.usage.usedCount).toBe(0);
    expect(first.usage.reservedCount).toBe(1);
    expect(first.reservedUntil.toISOString()).toBe('2026-08-06T03:02:00.000Z');

    await start(first.session.id, 'start-1');
    expect(harness.state.quotas[0]).toMatchObject({
      usedCount: 1,
      reservedCount: 0,
    });
    expect(harness.state.sessions[0].mustEndAt?.toISOString()).toBe(
      '2026-08-06T03:03:00.000Z',
    );
    expect(harness.state.endJobs[0]).toMatchObject({
      sessionId: first.session.id,
      status: 'PENDING',
    });
    expect(harness.state.endJobs[0].dueAt.toISOString()).toBe(
      '2026-08-06T03:03:00.000Z',
    );
    submit(first.session.id);

    const second = await reserve();
    await start(second.session.id, 'start-2');
    expect(harness.state.quotas[0].usedCount).toBe(2);
    submit(second.session.id);

    await expect(reserve()).rejects.toBeInstanceOf(SpeakingLimitError);
  });

  it('lets admin reserve after the daily student limit', async () => {
    const adminAuth = {
      ...authSession,
      username: 'admin',
      displayName: 'Admin',
      role: 'admin' as const,
    };
    harness.client.user.findUnique.mockResolvedValue({
      role: 'admin',
      archivedAt: null,
      portalLinkedAt: null,
      speakingAccountStatus: 'ACTIVE',
    });

    const first = await reserve();
    await finalizeActivityAttempt({
      sessionId: first.session.id,
      userId: adminAuth.userId,
      authSession: adminAuth,
      idempotencyKey: 'admin-1',
      now,
    });
    submit(first.session.id);

    const second = await reserve();
    await finalizeActivityAttempt({
      sessionId: second.session.id,
      userId: adminAuth.userId,
      authSession: adminAuth,
      idempotencyKey: 'admin-2',
      now,
    });
    submit(second.session.id);

    const third = await reserve();
    await finalizeActivityAttempt({
      sessionId: third.session.id,
      userId: adminAuth.userId,
      authSession: adminAuth,
      idempotencyKey: 'admin-3',
      now,
    });
    expect(harness.state.quotas[0].usedCount).toBe(3);
  });

  it('returns the same result for a duplicate started request', async () => {
    const reservation = await reserve();
    const first = await start(reservation.session.id, 'stable-key');
    const retry = await start(reservation.session.id, 'stable-key');

    expect(first.alreadyStarted).toBe(false);
    expect(retry.alreadyStarted).toBe(true);
    expect(retry.session.id).toBe(first.session.id);
    expect(harness.state.quotas[0].usedCount).toBe(1);
    expect(harness.state.sessions[0].startIdempotencyKey).toBe('stable-key');
    expect(harness.state.endJobs).toHaveLength(1);
  });

  it('reuses an already-started session with a new reconnect key', async () => {
    const reservation = await reserve();
    await start(reservation.session.id, 'original-key');
    const reconnect = await start(reservation.session.id, 'reconnect-key');

    expect(reconnect.alreadyStarted).toBe(true);
    expect(harness.state.quotas[0].usedCount).toBe(1);
    expect(harness.state.endJobs).toHaveLength(1);
  });

  it('serializes concurrent Realtime reservations and keeps one active hold', async () => {
    const results = await Promise.allSettled([reserve(), reserve()]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: expect.any(SpeakingConflictError),
    });
    expect(harness.client.$executeRaw).toHaveBeenCalledTimes(2);
    expect(harness.state.quotas[0].reservedCount).toBe(1);
  });

  it('reclaims an expired 120-second reservation without consuming quota', async () => {
    const first = await reserve(now);
    const afterExpiry = new Date(now.getTime() + 121_000);
    const second = await reserve(afterExpiry);

    expect(second.session.id).not.toBe(first.session.id);
    expect(harness.state.sessions[0]).toMatchObject({
      status: 'INTERRUPTED',
      failureCode: 'RESERVATION_EXPIRED',
    });
    expect(harness.state.quotas[0]).toMatchObject({
      usedCount: 0,
      reservedCount: 1,
      sessionId: second.session.id,
    });
  });

  it('moves a reservation across the Vietnam midnight boundary before counting', async () => {
    const beforeMidnight = new Date('2026-08-05T16:59:30.000Z');
    const afterMidnight = new Date('2026-08-05T17:00:05.000Z');
    const reservation = await reserve(beforeMidnight);
    await start(reservation.session.id, 'boundary-key', afterMidnight);

    expect(harness.state.quotas).toHaveLength(2);
    expect(harness.state.quotas[0]).toMatchObject({
      usedCount: 0,
      reservedCount: 0,
    });
    expect(harness.state.quotas[1].usageDateVN.toISOString()).toBe(
      '2026-08-06T00:00:00.000Z',
    );
    expect(harness.state.quotas[1].usedCount).toBe(1);
  });

  it('admin release decrements exactly one count and writes an audit row', async () => {
    const first = await reserve();
    await start(first.session.id, 'release-1');
    submit(first.session.id);
    const second = await reserve();
    await start(second.session.id, 'release-2');
    submit(second.session.id);

    const result = await releaseDailyUsage({
      usageId: harness.state.quotas[0].id,
      adminId: 'admin-1',
      reason: 'Lỗi kỹ thuật',
      now,
    });

    expect(result.usage.usedCount).toBe(1);
    expect(harness.state.releases).toHaveLength(1);
    expect(harness.state.releases[0]).toMatchObject({
      releasedCount: 1,
      usedCountBefore: 2,
      usedCountAfter: 1,
      reason: 'Lỗi kỹ thuật',
    });
  });
});
