import type { SessionPayload } from '@/lib/session';
import { prisma } from '@/lib/db';
import {
  evaluateSpeakingAccess,
  SpeakingAccessError,
  type SpeakingAccessConfig,
} from '@/lib/speaking/access';
import {
  DAILY_USAGE_STATUS,
  isSpeakingEmergencyDisabled,
  OPENAI_REALTIME_MODEL,
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
  type SpeakingActivityType,
} from '@/lib/speaking/config';
import {
  usageDateString,
  usageDateToUtcMidnight,
} from '@/lib/speaking/dates';

export class SpeakingLimitError extends Error {
  status = 409;
  code = 'DAILY_SPEAKING_LIMIT_REACHED';
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SpeakingLimitError';
    this.details = details;
  }
}

export class SpeakingConflictError extends Error {
  status = 409;
  code: string;
  details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SpeakingConflictError';
    this.code = code;
    this.details = details;
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const PRE_START_STATUSES = [
  SPEAKING_SESSION_STATUS.RESERVED,
  SPEAKING_SESSION_STATUS.CONNECTING,
];
const BLOCKING_REALTIME_STATUSES = [
  ...PRE_START_STATUSES,
  SPEAKING_SESSION_STATUS.ACTIVE,
];

function httpError(status: number, message: string) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function legacyStatus(usedCount: number, reservedCount: number, limit: number) {
  if (usedCount >= limit) return DAILY_USAGE_STATUS.CONSUMED;
  if (reservedCount > 0) return DAILY_USAGE_STATUS.RESERVED;
  return DAILY_USAGE_STATUS.AVAILABLE;
}

async function lockQuota(
  tx: Tx,
  userId: string,
  activityType: SpeakingActivityType,
) {
  // One lock across VN-day boundaries makes reservation transfer at midnight safe.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`speaking-quota:${userId}:${activityType}`}))`;
}

function configSnapshot(config: SpeakingAccessConfig) {
  return {
    dailyLimit: config.dailyLimit,
    durationSeconds: config.durationSeconds,
    reservationTtlSeconds: config.reservationTtlSeconds,
    promptVersion: config.promptVersion,
  };
}

async function ensureSessionEndJob(
  tx: Tx,
  session: { id: string; mustEndAt: Date | null },
) {
  if (!session.mustEndAt) {
    throw httpError(500, 'Phiên Active thiếu mustEndAt');
  }
  return tx.speakingSessionEndJob.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      dueAt: session.mustEndAt,
      status: 'PENDING',
    },
    update: { dueAt: session.mustEndAt },
  });
}

async function loadEnabledConfig(
  tx: Tx,
  activityType: SpeakingActivityType,
): Promise<SpeakingAccessConfig> {
  const config = await tx.speakingActivityConfig.findUnique({
    where: { activityType },
    select: {
      enabled: true,
      dailyLimit: true,
      durationSeconds: true,
      reservationTtlSeconds: true,
      promptVersion: true,
    },
  });
  if (!config?.enabled) {
    throw httpError(403, 'Hoạt động Speaking hiện chưa được bật');
  }
  return {
    dailyLimit: config.dailyLimit,
    durationSeconds: config.durationSeconds,
    reservationTtlSeconds: config.reservationTtlSeconds,
    promptVersion: config.promptVersion,
  };
}

async function findQuota(
  tx: Tx,
  userId: string,
  usageDateVN: Date,
  activityType: SpeakingActivityType,
) {
  return tx.dailySpeakingUsage.findUnique({
    where: {
      userId_usageDateVN_activityType: {
        userId,
        usageDateVN,
        activityType,
      },
    },
  });
}

async function ensureQuota(
  tx: Tx,
  input: {
    userId: string;
    usageDateVN: Date;
    activityType: SpeakingActivityType;
    limit: number;
  },
) {
  const existing = await findQuota(
    tx,
    input.userId,
    input.usageDateVN,
    input.activityType,
  );
  if (existing) return existing;
  return tx.dailySpeakingUsage.create({
    data: {
      userId: input.userId,
      usageDateVN: input.usageDateVN,
      activityType: input.activityType,
      usedCount: 0,
      reservedCount: 0,
      limitSnapshot: input.limit,
      // Compatibility fields.
      usageDate: input.usageDateVN,
      status: DAILY_USAGE_STATUS.AVAILABLE,
    },
  });
}

async function decrementReservation(
  tx: Tx,
  quotaId: string,
  amount = 1,
) {
  const quota = await tx.dailySpeakingUsage.findUnique({ where: { id: quotaId } });
  if (!quota || quota.reservedCount <= 0) return quota;
  const reservedCount = Math.max(0, quota.reservedCount - amount);
  return tx.dailySpeakingUsage.update({
    where: { id: quota.id },
    data: {
      reservedCount,
      status: legacyStatus(quota.usedCount, reservedCount, quota.limitSnapshot),
      ...(reservedCount === 0
        ? { reservedUntil: null, sessionId: null }
        : {}),
    },
  });
}

/** Reclaim stale pre-start holds and over-time live sessions under the quota lock. */
async function reclaimExpiredSessions(
  tx: Tx,
  userId: string,
  activityType: SpeakingActivityType,
  now: Date,
) {
  const expiredReservations = await tx.speakingSession.findMany({
    where: {
      userId,
      activityType,
      kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
      status: { in: PRE_START_STATUSES },
      reservationExpiresAt: { lte: now },
    },
    select: { id: true, quotaUsageId: true },
  });

  if (expiredReservations.length > 0) {
    await tx.speakingSession.updateMany({
      where: {
        id: { in: expiredReservations.map((session) => session.id) },
        status: { in: PRE_START_STATUSES },
      },
      data: {
        status: SPEAKING_SESSION_STATUS.INTERRUPTED,
        endedAt: now,
        failedAt: now,
        failureStage: 'RESERVATION',
        failureCode: 'RESERVATION_EXPIRED',
        errorMessage: 'Reservation hết hạn',
      },
    });

    const reclaimedByQuota = new Map<string, number>();
    for (const session of expiredReservations) {
      if (!session.quotaUsageId) continue;
      reclaimedByQuota.set(
        session.quotaUsageId,
        (reclaimedByQuota.get(session.quotaUsageId) ?? 0) + 1,
      );
    }
    for (const [quotaId, count] of reclaimedByQuota) {
      await decrementReservation(tx, quotaId, count);
    }
  }

  await tx.speakingSession.updateMany({
    where: {
      userId,
      activityType,
      kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
      status: SPEAKING_SESSION_STATUS.ACTIVE,
      mustEndAt: { lte: now },
    },
    data: {
      status: SPEAKING_SESSION_STATUS.INTERRUPTED,
      endedAt: now,
      failedAt: now,
      failureStage: 'ACTIVE',
      failureCode: 'SESSION_DURATION_EXPIRED',
      errorMessage: 'Phiên đã quá thời lượng cho phép',
    },
  });
}

export type ReserveActivityAttemptInput = {
  userId: string;
  courseId: string;
  activityType: SpeakingActivityType;
  topicId?: string | null;
  now?: Date;
};

/**
 * General quota reservation for Realtime and future 30/20/15-attempt drills.
 * A reservation holds capacity but does not increment usedCount.
 */
export async function reserveActivityAttempt(
  input: ReserveActivityAttemptInput,
) {
  const now = input.now ?? new Date();
  const dateStr = usageDateString(now);
  const usageDateVN = usageDateToUtcMidnight(dateStr);

  return prisma.$transaction(async (tx) => {
    await lockQuota(tx, input.userId, input.activityType);
    const config = await loadEnabledConfig(tx, input.activityType);
    await reclaimExpiredSessions(tx, input.userId, input.activityType, now);

    const topic = input.topicId
      ? await tx.speakingTopic.findFirst({
          where: {
            id: input.topicId,
            courseId: input.courseId,
            active: true,
            archivedAt: null,
          },
          select: {
            id: true,
            title: true,
            instructions: true,
            durationSeconds: true,
            courseId: true,
          },
        })
      : null;
    if (input.topicId && !topic) {
      throw httpError(404, 'Topic không hoạt động hoặc không tồn tại');
    }
    if (input.activityType === 'REALTIME_CONVERSATION' && !topic) {
      throw httpError(400, 'Realtime Conversation cần topic');
    }

    if (input.activityType === 'REALTIME_CONVERSATION') {
      const blocking = await tx.speakingSession.findFirst({
        where: {
          userId: input.userId,
          activityType: input.activityType,
          kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
          status: { in: BLOCKING_REALTIME_STATUSES },
        },
        select: {
          id: true,
          status: true,
          reservationExpiresAt: true,
          mustEndAt: true,
        },
      });
      if (blocking) {
        throw new SpeakingConflictError(
          'SPEAKING_SESSION_ACTIVE',
          'Một phiên Realtime khác đang hoạt động',
          {
            sessionId: blocking.id,
            status: blocking.status,
            reservedUntil: blocking.reservationExpiresAt?.toISOString() ?? null,
            mustEndAt: blocking.mustEndAt?.toISOString() ?? null,
          },
        );
      }
    }

    const quota = await ensureQuota(tx, {
      userId: input.userId,
      usageDateVN,
      activityType: input.activityType,
      limit: config.dailyLimit,
    });
    if (quota.usedCount >= quota.limitSnapshot) {
      throw new SpeakingLimitError('Bạn đã dùng hết lượt Speaking hôm nay', {
        usageId: quota.id,
        activityType: input.activityType,
        used: quota.usedCount,
        limit: quota.limitSnapshot,
      });
    }
    if (quota.usedCount + quota.reservedCount >= quota.limitSnapshot) {
      throw new SpeakingConflictError(
        'SPEAKING_RESERVATION_ACTIVE',
        'Các lượt Speaking còn lại đang được giữ chỗ',
        {
          usageId: quota.id,
          activityType: input.activityType,
          reserved: quota.reservedCount,
        },
      );
    }

    const reservationExpiresAt = new Date(
      now.getTime() + config.reservationTtlSeconds * 1000,
    );
    const reservedCount = quota.reservedCount + 1;
    const updatedQuota = await tx.dailySpeakingUsage.update({
      where: { id: quota.id },
      data: {
        reservedCount,
        status: DAILY_USAGE_STATUS.RESERVED,
        reservedUntil: reservationExpiresAt,
      },
    });
    const session = await tx.speakingSession.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        topicId: topic?.id ?? null,
        activityType: input.activityType,
        kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
        status: SPEAKING_SESSION_STATUS.RESERVED,
        reservationExpiresAt,
        configSnapshot: configSnapshot(config),
        model:
          input.activityType === 'REALTIME_CONVERSATION'
            ? OPENAI_REALTIME_MODEL
            : null,
        quotaUsageId: quota.id,
      },
    });
    const usage = await tx.dailySpeakingUsage.update({
      where: { id: quota.id },
      data: {
        sessionId: session.id,
        reservedUntil: reservationExpiresAt,
      },
    });

    return {
      session,
      topic,
      usage: { ...updatedQuota, ...usage, reservedCount },
      config,
      reservedUntil: reservationExpiresAt,
    };
  });
}

/** Current topic-backed Realtime wrapper retained for route compatibility. */
export async function createPracticeSession(input: {
  userId: string;
  topicId: string;
  courseId?: string;
  now?: Date;
}) {
  let courseId = input.courseId;
  if (!courseId) {
    const topic = await prisma.speakingTopic.findUnique({
      where: { id: input.topicId },
      select: { courseId: true },
    });
    if (!topic) throw httpError(404, 'Topic không hoạt động hoặc không tồn tại');
    courseId = topic.courseId;
  }
  const result = await reserveActivityAttempt({
    userId: input.userId,
    courseId,
    topicId: input.topicId,
    activityType: 'REALTIME_CONVERSATION',
    now: input.now,
  });
  if (!result.topic) {
    throw httpError(500, 'Phiên Realtime thiếu topic');
  }
  return { ...result, topic: result.topic };
}

/** Admin preview — no daily usage row. */
export async function createPreviewSession(input: {
  userId: string;
  topicId: string;
}) {
  const [topic, activityConfig] = await Promise.all([
    prisma.speakingTopic.findFirst({
      where: { id: input.topicId, archivedAt: null },
      select: {
        id: true,
        title: true,
        instructions: true,
        durationSeconds: true,
        courseId: true,
        active: true,
      },
    }),
    prisma.speakingActivityConfig.findUnique({
      where: { activityType: 'REALTIME_CONVERSATION' },
      select: {
        enabled: true,
        dailyLimit: true,
        durationSeconds: true,
        reservationTtlSeconds: true,
        promptVersion: true,
      },
    }),
  ]);
  if (!topic) throw httpError(404, 'Không tìm thấy topic');

  const config = activityConfig ?? {
    enabled: false,
    dailyLimit: 2,
    durationSeconds: topic.durationSeconds,
    reservationTtlSeconds: 120,
    promptVersion: 'v1',
  };
  const session = await prisma.speakingSession.create({
    data: {
      userId: input.userId,
      courseId: topic.courseId,
      topicId: topic.id,
      activityType: 'REALTIME_CONVERSATION',
      kind: SPEAKING_SESSION_KIND.ADMIN_PREVIEW,
      status: SPEAKING_SESSION_STATUS.RESERVED,
      configSnapshot: configSnapshot(config),
      model: OPENAI_REALTIME_MODEL,
    },
  });

  return {
    session,
    topic,
    previewState: {
      emergencyDisabled: isSpeakingEmergencyDisabled(),
      activityEnabled: config.enabled,
      bypassesStudentKillSwitch: true,
    },
  };
}

type ReservationFailure = {
  errorMessage: string;
  failureCode?: string;
  failureStage?: string;
};

async function releaseReservationTx(
  tx: Tx,
  session: {
    id: string;
    quotaUsageId: string | null;
    usageCountedAt: Date | null;
  },
  failure: ReservationFailure,
  now: Date,
) {
  if (session.usageCountedAt) return false;
  if (session.quotaUsageId) {
    await decrementReservation(tx, session.quotaUsageId);
  }
  await tx.speakingSession.update({
    where: { id: session.id },
    data: {
      status: SPEAKING_SESSION_STATUS.FAILED,
      endedAt: now,
      failedAt: now,
      failureStage: failure.failureStage ?? 'PRE_START',
      failureCode: failure.failureCode ?? 'PRE_START_FAILURE',
      errorMessage: failure.errorMessage,
      reservationExpiresAt: null,
    },
  });
  return true;
}

export type FinalizeActivityAttemptInput = {
  sessionId: string;
  userId: string;
  authSession: SessionPayload;
  idempotencyKey?: string | null;
  now?: Date;
};

/**
 * Finalize a held attempt exactly once. Access and quota are checked again in
 * the same advisory-locked transaction that increments usedCount.
 */
export async function finalizeActivityAttempt(
  input: FinalizeActivityAttemptInput,
) {
  const now = input.now ?? new Date();
  const suppliedKey = input.idempotencyKey?.trim().slice(0, 200) || null;
  const outcome = await prisma.$transaction(async (tx) => {
    const initial = await tx.speakingSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!initial || initial.userId !== input.userId) {
      throw httpError(404, 'Không tìm thấy phiên');
    }

    await lockQuota(
      tx,
      initial.userId,
      initial.activityType as SpeakingActivityType,
    );
    const session = await tx.speakingSession.findUnique({
      where: { id: initial.id },
    });
    if (!session || session.userId !== input.userId) {
      throw httpError(404, 'Không tìm thấy phiên');
    }

    if (session.startedAt || session.usageCountedAt) {
      await ensureSessionEndJob(tx, session);
      return { session, alreadyStarted: true as const };
    }
    if (
      suppliedKey &&
      session.startIdempotencyKey &&
      session.startIdempotencyKey !== suppliedKey
    ) {
      throw new SpeakingConflictError(
        'IDEMPOTENCY_KEY_CONFLICT',
        'Idempotency-Key đã khác lần bắt đầu trước',
      );
    }
    if (!PRE_START_STATUSES.includes(session.status as (typeof PRE_START_STATUSES)[number])) {
      throw new SpeakingConflictError(
        'SPEAKING_SESSION_NOT_STARTABLE',
        'Phiên không thể bắt đầu',
      );
    }
    if (
      session.reservationExpiresAt &&
      session.reservationExpiresAt.getTime() <= now.getTime()
    ) {
      await releaseReservationTx(
        tx,
        session,
        {
          errorMessage: 'Reservation hết hạn trước khi bắt đầu',
          failureCode: 'RESERVATION_EXPIRED',
          failureStage: 'START',
        },
        now,
      );
      return {
        error: new SpeakingConflictError(
          'SPEAKING_RESERVATION_EXPIRED',
          'Lượt giữ chỗ đã hết hạn',
        ),
      };
    }

    if (session.kind === SPEAKING_SESSION_KIND.ADMIN_PREVIEW) {
      const config = await tx.speakingActivityConfig.findUnique({
        where: { activityType: session.activityType },
        select: {
          dailyLimit: true,
          durationSeconds: true,
          reservationTtlSeconds: true,
          promptVersion: true,
        },
      });
      if (!config) {
        throw httpError(503, 'Thiếu cấu hình activity cho admin preview');
      }
      const updated = await tx.speakingSession.update({
        where: { id: session.id },
        data: {
          status: SPEAKING_SESSION_STATUS.ACTIVE,
          startedAt: now,
          mustEndAt: new Date(now.getTime() + config.durationSeconds * 1000),
          startIdempotencyKey:
            session.startIdempotencyKey ?? suppliedKey ?? `start:${session.id}`,
          configSnapshot: configSnapshot(config),
          reservationExpiresAt: null,
        },
      });
      await ensureSessionEndJob(tx, updated);
      return { session: updated, alreadyStarted: false as const };
    }

    const activityType = session.activityType as SpeakingActivityType;
    const access = await evaluateSpeakingAccess({
      session: input.authSession,
      courseId: session.courseId,
      activityType,
      now,
      db: tx,
    });
    if (!access.allowed || !access.config) {
      await releaseReservationTx(
        tx,
        session,
        {
          errorMessage: new SpeakingAccessError(access).message,
          failureCode: access.reason,
          failureStage: 'START_ACCESS',
        },
        now,
      );
      return { error: new SpeakingAccessError(access) };
    }

    const usageDateVN = usageDateToUtcMidnight(usageDateString(now));
    const quota = await ensureQuota(tx, {
      userId: session.userId,
      usageDateVN,
      activityType,
      limit: access.config.dailyLimit,
    });
    if (quota.usedCount >= quota.limitSnapshot) {
      await releaseReservationTx(
        tx,
        session,
        {
          errorMessage: 'Bạn đã dùng hết lượt Speaking hôm nay',
          failureCode: 'DAILY_SPEAKING_LIMIT_REACHED',
          failureStage: 'START_QUOTA',
        },
        now,
      );
      return {
        error: new SpeakingLimitError('Bạn đã dùng hết lượt Speaking hôm nay', {
          usageId: quota.id,
          used: quota.usedCount,
          limit: quota.limitSnapshot,
        }),
      };
    }

    if (session.quotaUsageId && session.quotaUsageId !== quota.id) {
      await decrementReservation(tx, session.quotaUsageId);
    }
    const reservedCount =
      session.quotaUsageId === quota.id
        ? Math.max(0, quota.reservedCount - 1)
        : quota.reservedCount;
    const usedCount = quota.usedCount + 1;
    await tx.dailySpeakingUsage.update({
      where: { id: quota.id },
      data: {
        usedCount,
        reservedCount,
        status: legacyStatus(usedCount, reservedCount, quota.limitSnapshot),
        sessionId: session.id,
        ...(reservedCount === 0 ? { reservedUntil: null } : {}),
      },
    });

    const updated = await tx.speakingSession.update({
      where: { id: session.id },
      data: {
        status: SPEAKING_SESSION_STATUS.ACTIVE,
        startedAt: now,
        mustEndAt: new Date(
          now.getTime() + access.config.durationSeconds * 1000,
        ),
        startIdempotencyKey:
          session.startIdempotencyKey ?? suppliedKey ?? `start:${session.id}`,
        configSnapshot: configSnapshot(access.config),
        model:
          activityType === 'REALTIME_CONVERSATION'
            ? session.model ?? OPENAI_REALTIME_MODEL
            : session.model,
        quotaUsageId: quota.id,
        usageCountedAt: now,
        reservationExpiresAt: null,
      },
    });
    await ensureSessionEndJob(tx, updated);
    return { session: updated, alreadyStarted: false as const };
  });

  if ('error' in outcome) throw outcome.error;
  return outcome;
}

/** Existing route-facing name. */
export const markSessionStarted = finalizeActivityAttempt;

/** Release a reservation after any failure before usage was counted. */
export async function releaseActivityReservation(input: {
  sessionId: string;
  userId: string;
  errorMessage: string;
  failureCode?: string;
  failureStage?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const initial = await tx.speakingSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!initial || initial.userId !== input.userId) {
      throw httpError(404, 'Không tìm thấy phiên');
    }
    await lockQuota(
      tx,
      initial.userId,
      initial.activityType as SpeakingActivityType,
    );
    const session = await tx.speakingSession.findUnique({
      where: { id: initial.id },
    });
    if (!session || session.userId !== input.userId) {
      throw httpError(404, 'Không tìm thấy phiên');
    }
    if (
      session.usageCountedAt ||
      !PRE_START_STATUSES.includes(session.status as (typeof PRE_START_STATUSES)[number])
    ) {
      return { released: false, session };
    }
    await releaseReservationTx(tx, session, input, now);
    const updated = await tx.speakingSession.findUnique({
      where: { id: session.id },
    });
    return { released: true, session: updated ?? session };
  });
}

/** Existing route-facing name. */
export const releaseReservationOnFailure = releaseActivityReservation;

/** Admin releases exactly one counted attempt and records before/after values. */
export async function releaseDailyUsage(input: {
  usageId: string;
  adminId: string;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const reason = input.reason.trim();
  if (!reason) throw httpError(400, 'Bắt buộc nhập lý do hoàn lượt');

  return prisma.$transaction(async (tx) => {
    const initial = await tx.dailySpeakingUsage.findUnique({
      where: { id: input.usageId },
    });
    if (!initial) throw httpError(404, 'Không tìm thấy lượt');
    await lockQuota(
      tx,
      initial.userId,
      initial.activityType as SpeakingActivityType,
    );
    const usage = await tx.dailySpeakingUsage.findUnique({
      where: { id: initial.id },
    });
    if (!usage) throw httpError(404, 'Không tìm thấy lượt');

    const today = usageDateToUtcMidnight(usageDateString(now));
    if (usage.usageDateVN.getTime() !== today.getTime()) {
      throw httpError(400, 'Chỉ hoàn được lượt của ngày hôm nay');
    }
    if (usage.usedCount < 1) {
      throw httpError(400, 'Lượt chưa tiêu thụ, không cần hoàn');
    }

    const session = await tx.speakingSession.findFirst({
      where: {
        userId: usage.userId,
        activityType: usage.activityType,
        usageCountedAt: { not: null },
        OR: [
          { quotaUsageId: usage.id },
          ...(usage.sessionId ? [{ id: usage.sessionId }] : []),
        ],
        usageReleases: { none: {} },
      },
      orderBy: { usageCountedAt: 'desc' },
    });
    if (!session) {
      throw httpError(400, 'Không tìm thấy phiên đã tính lượt để hoàn');
    }

    const usedCountBefore = usage.usedCount;
    const usedCountAfter = usedCountBefore - 1;
    await tx.dailySpeakingUsageRelease.create({
      data: {
        studentId: usage.userId,
        sessionId: session.id,
        usageId: usage.id,
        usageDate: usage.usageDateVN,
        activityType: usage.activityType,
        releasedCount: 1,
        usedCountBefore,
        usedCountAfter,
        adminId: input.adminId,
        reason,
      },
    });
    const updated = await tx.dailySpeakingUsage.update({
      where: { id: usage.id },
      data: {
        usedCount: usedCountAfter,
        status: legacyStatus(
          usedCountAfter,
          usage.reservedCount,
          usage.limitSnapshot,
        ),
        sessionId: null,
      },
    });

    return { usage: updated, sessionId: session.id };
  });
}
