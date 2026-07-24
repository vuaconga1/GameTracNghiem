import { prisma } from '@/lib/db';
import {
  DAILY_USAGE_STATUS,
  RESERVATION_TTL_MS,
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
} from '@/lib/speaking/config';
import {
  canStartNewSession,
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

async function loadTodayUsage(tx: Tx, userId: string, now: Date) {
  const dateStr = usageDateString(now);
  const usageDate = usageDateToUtcMidnight(dateStr);
  const usage = await tx.dailySpeakingUsage.findUnique({
    where: { userId_usageDate: { userId, usageDate } },
  });
  return { usage, usageDate, dateStr };
}

/**
 * Atomically reserve today's daily slot and create a STUDENT_PRACTICE session.
 * Concurrent callers: at most one succeeds.
 */
export async function createPracticeSession(input: {
  userId: string;
  topicId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const topic = await tx.speakingTopic.findFirst({
      where: { id: input.topicId, active: true, archivedAt: null },
      select: {
        id: true,
        title: true,
        instructions: true,
        durationSeconds: true,
        courseId: true,
      },
    });
    if (!topic) {
      const err = new Error('Topic không hoạt động hoặc không tồn tại') as Error & {
        status: number;
      };
      err.status = 404;
      throw err;
    }

    const dateStr = usageDateString(now);
    const usageDate = usageDateToUtcMidnight(dateStr);

    // Serialize concurrent create-session attempts for the same student+day.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`speaking:${input.userId}:${dateStr}`}))`;

    const usage = await tx.dailySpeakingUsage.findUnique({
      where: { userId_usageDate: { userId: input.userId, usageDate } },
    });

    if (usage?.status === DAILY_USAGE_STATUS.CONSUMED) {
      throw new SpeakingLimitError('Bạn đã dùng hết lượt Speaking hôm nay', {
        usageId: usage.id,
        sessionId: usage.sessionId,
      });
    }

    if (
      usage?.status === DAILY_USAGE_STATUS.RESERVED &&
      usage.reservedUntil &&
      usage.reservedUntil.getTime() > now.getTime()
    ) {
      throw new SpeakingConflictError(
        'SPEAKING_RESERVATION_ACTIVE',
        'Một phiên khác đang chuẩn bị Speaking',
        {
          usageId: usage.id,
          sessionId: usage.sessionId,
          reservedUntil: usage.reservedUntil.toISOString(),
        }
      );
    }

    // Reclaim expired reservation
    if (
      usage?.status === DAILY_USAGE_STATUS.RESERVED &&
      usage.sessionId &&
      canStartNewSession(usage.status, usage.reservedUntil, now)
    ) {
      await tx.speakingSession.update({
        where: { id: usage.sessionId },
        data: {
          status: SPEAKING_SESSION_STATUS.INTERRUPTED,
          endedAt: now,
          errorMessage: 'Reservation hết hạn',
        },
      });
    }

    const session = await tx.speakingSession.create({
      data: {
        userId: input.userId,
        topicId: topic.id,
        kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
        status: SPEAKING_SESSION_STATUS.RESERVED,
      },
    });

    const reservedUntil = new Date(now.getTime() + RESERVATION_TTL_MS);

    const upserted = await tx.dailySpeakingUsage.upsert({
      where: { userId_usageDate: { userId: input.userId, usageDate } },
      create: {
        userId: input.userId,
        usageDate,
        status: DAILY_USAGE_STATUS.RESERVED,
        sessionId: session.id,
        reservedUntil,
      },
      update: {
        status: DAILY_USAGE_STATUS.RESERVED,
        sessionId: session.id,
        reservedUntil,
      },
    });

    return { session, topic, usage: upserted, reservedUntil };
  });
}

/** Admin preview — no daily usage row. */
export async function createPreviewSession(input: {
  userId: string;
  topicId: string;
}) {
  const topic = await prisma.speakingTopic.findFirst({
    where: { id: input.topicId, archivedAt: null },
    select: {
      id: true,
      title: true,
      instructions: true,
      durationSeconds: true,
      courseId: true,
      active: true,
    },
  });
  if (!topic) {
    const err = new Error('Không tìm thấy topic') as Error & { status: number };
    err.status = 404;
    throw err;
  }

  const session = await prisma.speakingSession.create({
    data: {
      userId: input.userId,
      topicId: topic.id,
      kind: SPEAKING_SESSION_KIND.ADMIN_PREVIEW,
      status: SPEAKING_SESSION_STATUS.RESERVED,
    },
  });

  return { session, topic };
}

/**
 * Idempotent: mark session ACTIVE and usage CONSUMED when AI starts speaking.
 * Preview sessions skip usage.
 */
export async function markSessionStarted(input: {
  sessionId: string;
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.speakingSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session || session.userId !== input.userId) {
      const err = new Error('Không tìm thấy phiên') as Error & { status: number };
      err.status = 404;
      throw err;
    }

    if (
      session.status === SPEAKING_SESSION_STATUS.ACTIVE ||
      session.status === SPEAKING_SESSION_STATUS.FINISHING ||
      session.status === SPEAKING_SESSION_STATUS.UPLOADING ||
      session.status === SPEAKING_SESSION_STATUS.SUBMITTED ||
      session.status === SPEAKING_SESSION_STATUS.UPLOAD_FAILED
    ) {
      return { session, alreadyStarted: true };
    }

    if (
      session.status !== SPEAKING_SESSION_STATUS.RESERVED &&
      session.status !== SPEAKING_SESSION_STATUS.CONNECTING
    ) {
      const err = new Error('Phiên không thể bắt đầu') as Error & { status: number };
      err.status = 409;
      throw err;
    }

    const updated = await tx.speakingSession.update({
      where: { id: session.id },
      data: {
        status: SPEAKING_SESSION_STATUS.ACTIVE,
        startedAt: session.startedAt ?? now,
      },
    });

    if (session.kind === SPEAKING_SESSION_KIND.STUDENT_PRACTICE) {
      const { usage, usageDate } = await loadTodayUsage(tx, input.userId, now);
      if (usage) {
        await tx.dailySpeakingUsage.update({
          where: { id: usage.id },
          data: {
            status: DAILY_USAGE_STATUS.CONSUMED,
            sessionId: session.id,
            reservedUntil: null,
          },
        });
      } else {
        await tx.dailySpeakingUsage.create({
          data: {
            userId: input.userId,
            usageDate,
            status: DAILY_USAGE_STATUS.CONSUMED,
            sessionId: session.id,
          },
        });
      }
    }

    return { session: updated, alreadyStarted: false };
  });
}

/** Release reservation when failure happens before AI opening audio. */
export async function releaseReservationOnFailure(input: {
  sessionId: string;
  userId: string;
  errorMessage: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.speakingSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session || session.userId !== input.userId) {
      const err = new Error('Không tìm thấy phiên') as Error & { status: number };
      err.status = 404;
      throw err;
    }

    if (
      session.status !== SPEAKING_SESSION_STATUS.RESERVED &&
      session.status !== SPEAKING_SESSION_STATUS.CONNECTING
    ) {
      return { released: false, session };
    }

    const updated = await tx.speakingSession.update({
      where: { id: session.id },
      data: {
        status: SPEAKING_SESSION_STATUS.FAILED,
        endedAt: now,
        errorMessage: input.errorMessage,
      },
    });

    if (session.kind === SPEAKING_SESSION_KIND.STUDENT_PRACTICE) {
      const usage = await tx.dailySpeakingUsage.findFirst({
        where: { sessionId: session.id },
      });
      if (usage && usage.status === DAILY_USAGE_STATUS.RESERVED) {
        await tx.dailySpeakingUsage.update({
          where: { id: usage.id },
          data: {
            status: DAILY_USAGE_STATUS.AVAILABLE,
            sessionId: null,
            reservedUntil: null,
          },
        });
      }
    }

    return { released: true, session: updated };
  });
}

/** Admin release today's consumed usage so student can practice again. */
export async function releaseDailyUsage(input: {
  usageId: string;
  adminId: string;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const reason = input.reason.trim();
  if (!reason) {
    const err = new Error('Bắt buộc nhập lý do hoàn lượt') as Error & { status: number };
    err.status = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const usage = await tx.dailySpeakingUsage.findUnique({
      where: { id: input.usageId },
    });
    if (!usage) {
      const err = new Error('Không tìm thấy lượt') as Error & { status: number };
      err.status = 404;
      throw err;
    }

    const today = usageDateToUtcMidnight(usageDateString(now));
    if (usage.usageDate.getTime() !== today.getTime()) {
      const err = new Error('Chỉ hoàn được lượt của ngày hôm nay') as Error & {
        status: number;
      };
      err.status = 400;
      throw err;
    }

    if (usage.status !== DAILY_USAGE_STATUS.CONSUMED) {
      const err = new Error('Lượt chưa tiêu thụ, không cần hoàn') as Error & {
        status: number;
      };
      err.status = 400;
      throw err;
    }

    const sessionId = usage.sessionId;
    if (!sessionId) {
      const err = new Error('Thiếu session gắn với lượt') as Error & { status: number };
      err.status = 400;
      throw err;
    }

    await tx.dailySpeakingUsageRelease.create({
      data: {
        studentId: usage.userId,
        sessionId,
        usageDate: usage.usageDate,
        adminId: input.adminId,
        reason,
      },
    });

    const updated = await tx.dailySpeakingUsage.update({
      where: { id: usage.id },
      data: {
        status: DAILY_USAGE_STATUS.AVAILABLE,
        sessionId: null,
        reservedUntil: null,
      },
    });

    return { usage: updated, sessionId };
  });
}
