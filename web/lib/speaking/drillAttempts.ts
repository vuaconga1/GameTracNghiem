import type { Prisma } from '@prisma/client';

import type { SessionPayload } from '@/lib/session';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import {
  assertSpeakingAccess,
  type SpeakingAccessConfig,
} from '@/lib/speaking/access';
import {
  DAILY_USAGE_STATUS,
  OPENAI_GUIDED_MODEL,
  OPENAI_TRANSCRIPTION_MODEL,
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
} from '@/lib/speaking/config';
import {
  parseSpeakingDrillPayload,
  SPEAKING_DRILL_GAME,
  type SpeakingDrillActivityType,
  type SpeakingDrillPayload,
} from '@/lib/speaking/drillSchemas';
import {
  usageDateString,
  usageDateToUtcMidnight,
} from '@/lib/speaking/dates';
import { DrillAttemptError } from '@/lib/speaking/drillErrors';
import {
  SPEAKING_DRILL_CORRECT_THRESHOLD,
  speakingDrillPracticeScore,
} from '@/lib/speaking/practiceScoring';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const ATTEMPT_STATUS = {
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

function legacyStatus(usedCount: number, reservedCount: number, limit: number) {
  if (usedCount >= limit) return DAILY_USAGE_STATUS.CONSUMED;
  if (reservedCount > 0) return DAILY_USAGE_STATUS.RESERVED;
  return DAILY_USAGE_STATUS.AVAILABLE;
}

async function lockDrillUser(tx: Tx, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`speaking-drill:${userId}`}))`;
}

async function lockQuota(
  tx: Tx,
  userId: string,
  activityType: SpeakingDrillActivityType,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`speaking-quota:${userId}:${activityType}`}))`;
}

async function findQuota(
  tx: Tx,
  input: {
    userId: string;
    usageDateVN: Date;
    activityType: SpeakingDrillActivityType;
  },
) {
  return tx.dailySpeakingUsage.findUnique({
    where: {
      userId_usageDateVN_activityType: input,
    },
  });
}

async function ensureQuota(
  tx: Tx,
  input: {
    userId: string;
    usageDateVN: Date;
    activityType: SpeakingDrillActivityType;
    limit: number;
  },
) {
  const existing = await findQuota(tx, input);
  if (existing) return existing;
  return tx.dailySpeakingUsage.create({
    data: {
      userId: input.userId,
      usageDateVN: input.usageDateVN,
      usageDate: input.usageDateVN,
      activityType: input.activityType,
      usedCount: 0,
      reservedCount: 0,
      limitSnapshot: input.limit,
      status: DAILY_USAGE_STATUS.AVAILABLE,
    },
  });
}

async function decrementReservation(
  tx: Tx,
  quotaId: string,
  amount = 1,
) {
  const quota = await tx.dailySpeakingUsage.findUnique({
    where: { id: quotaId },
  });
  if (!quota || quota.reservedCount <= 0) return quota;
  const reservedCount = Math.max(0, quota.reservedCount - amount);
  return tx.dailySpeakingUsage.update({
    where: { id: quota.id },
    data: {
      reservedCount,
      status: legacyStatus(
        quota.usedCount,
        reservedCount,
        quota.limitSnapshot,
      ),
      ...(reservedCount === 0
        ? { reservedUntil: null, sessionId: null }
        : {}),
    },
  });
}

async function reclaimExpiredDrillReservations(
  tx: Tx,
  input: {
    userId: string;
    activityType: SpeakingDrillActivityType;
    now: Date;
  },
) {
  const expired = await tx.speakingAttempt.findMany({
    where: {
      userId: input.userId,
      activityType: input.activityType,
      status: ATTEMPT_STATUS.PROCESSING,
      reservationExpiresAt: { lte: input.now },
    },
    select: {
      id: true,
      sessionId: true,
      session: { select: { quotaUsageId: true } },
    },
  });
  if (expired.length === 0) return;

  const quotaCounts = new Map<string, number>();
  for (const attempt of expired) {
    if (!attempt.session.quotaUsageId) continue;
    quotaCounts.set(
      attempt.session.quotaUsageId,
      (quotaCounts.get(attempt.session.quotaUsageId) ?? 0) + 1,
    );
  }
  for (const [quotaId, count] of quotaCounts) {
    await decrementReservation(tx, quotaId, count);
  }
  await tx.speakingAttempt.updateMany({
    where: { id: { in: expired.map((attempt) => attempt.id) } },
    data: {
      status: ATTEMPT_STATUS.FAILED,
      failedAt: input.now,
      failureCode: 'RESERVATION_EXPIRED',
    },
  });
  await tx.speakingSession.updateMany({
    where: { id: { in: expired.map((attempt) => attempt.sessionId) } },
    data: {
      status: SPEAKING_SESSION_STATUS.FAILED,
      endedAt: input.now,
      failedAt: input.now,
      failureStage: 'DRILL_RESERVATION',
      failureCode: 'RESERVATION_EXPIRED',
      errorMessage: 'Short drill reservation expired',
      reservationExpiresAt: null,
    },
  });
}

function modelForPayload(payload: SpeakingDrillPayload): string {
  return payload.kind === 'guided'
    ? `${OPENAI_TRANSCRIPTION_MODEL}+${OPENAI_GUIDED_MODEL}`
    : OPENAI_TRANSCRIPTION_MODEL;
}

type AttemptView = {
  id: string;
  questionId: string;
  activityType: string;
  status: string;
  serverTranscript: string | null;
  score: number | null;
  details: unknown;
  feedback: unknown;
  completedAt: Date | null;
  scoreLog?: {
    isCorrect: boolean;
    points: number;
  } | null;
};

export function publicSpeakingAttempt(attempt: AttemptView) {
  return {
    id: attempt.id,
    questionId: attempt.questionId,
    activityType: attempt.activityType,
    status: attempt.status,
    transcript: attempt.serverTranscript,
    score: attempt.score,
    details: attempt.details,
    feedback: attempt.feedback,
    isCorrect: attempt.scoreLog?.isCorrect ?? null,
    points: attempt.scoreLog?.points ?? 0,
    completedAt: attempt.completedAt?.toISOString() ?? null,
  };
}

export type ReservedSpeakingDrillAttempt = {
  kind: 'reserved';
  attemptId: string;
  sessionId: string;
  payload: SpeakingDrillPayload;
  config: SpeakingAccessConfig;
  promptVersion: string;
};

export type ExistingSpeakingDrillAttempt = {
  kind: 'completed';
  attempt: ReturnType<typeof publicSpeakingAttempt>;
};

export async function reserveSpeakingDrillAttempt(input: {
  authSession: SessionPayload;
  courseId: string;
  questionId: string;
  activityType: SpeakingDrillActivityType;
  idempotencyKey: string;
  now?: Date;
}): Promise<ReservedSpeakingDrillAttempt | ExistingSpeakingDrillAttempt> {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    await lockDrillUser(tx, input.authSession.userId);
    await lockQuota(tx, input.authSession.userId, input.activityType);

    const prior = await tx.speakingAttempt.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: input.authSession.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { scoreLog: true },
    });
    if (prior) {
      if (prior.status === ATTEMPT_STATUS.COMPLETED) {
        return { kind: 'completed', attempt: publicSpeakingAttempt(prior) };
      }
      if (prior.status === ATTEMPT_STATUS.FAILED) {
        throw new DrillAttemptError(
          'ATTEMPT_PREVIOUSLY_FAILED',
          'This recording was not counted. Record again to retry.',
          409,
          { attemptId: prior.id, counted: false },
        );
      }
      throw new DrillAttemptError(
        'ATTEMPT_IN_PROGRESS',
        'This recording is already being assessed.',
        409,
        { attemptId: prior.id },
      );
    }

    await reclaimExpiredDrillReservations(tx, {
      userId: input.authSession.userId,
      activityType: input.activityType,
      now,
    });

    const access = await assertSpeakingAccess({
      session: input.authSession,
      courseId: input.courseId,
      activityType: input.activityType,
      now,
      db: tx,
    });
    if (!access.config) {
      throw new DrillAttemptError(
        'MISSING_ACTIVITY_CONFIG',
        'Speaking activity configuration is unavailable.',
        503,
      );
    }

    const question = await tx.question.findFirst({
      where: {
        id: input.questionId,
        courseId: input.courseId,
        game: SPEAKING_DRILL_GAME,
        active: true,
        archivedAt: null,
      },
      select: { id: true, payload: true },
    });
    if (!question) {
      throw new DrillAttemptError(
        'DRILL_NOT_FOUND',
        'Speaking practice content was not found.',
        404,
      );
    }
    let payload: SpeakingDrillPayload;
    try {
      payload = parseSpeakingDrillPayload(
        question.payload,
        input.activityType,
      );
    } catch {
      throw new DrillAttemptError(
        'INVALID_DRILL_CONTENT',
        'Speaking practice content is invalid.',
        500,
      );
    }

    const usageDateVN = usageDateToUtcMidnight(usageDateString(now));
    const quota = await ensureQuota(tx, {
      userId: input.authSession.userId,
      usageDateVN,
      activityType: input.activityType,
      limit: access.config.dailyLimit,
    });
    if (quota.usedCount >= quota.limitSnapshot) {
      throw new DrillAttemptError(
        'DAILY_SPEAKING_LIMIT_REACHED',
        'You have used all Speaking turns for today.',
        409,
      );
    }
    if (quota.usedCount + quota.reservedCount >= quota.limitSnapshot) {
      throw new DrillAttemptError(
        'SPEAKING_RESERVATION_ACTIVE',
        'Your remaining Speaking turns are being assessed.',
        409,
      );
    }

    const reservationExpiresAt = new Date(
      now.getTime() + access.config.reservationTtlSeconds * 1_000,
    );
    const model = modelForPayload(payload);
    const session = await tx.speakingSession.create({
      data: {
        userId: input.authSession.userId,
        courseId: input.courseId,
        activityType: input.activityType,
        kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
        status: SPEAKING_SESSION_STATUS.RESERVED,
        reservationExpiresAt,
        configSnapshot: {
          ...access.config,
          questionId: question.id,
          shortDrill: true,
        },
        model,
        quotaUsageId: quota.id,
      },
    });
    const attempt = await tx.speakingAttempt.create({
      data: {
        sessionId: session.id,
        userId: input.authSession.userId,
        courseId: input.courseId,
        questionId: question.id,
        activityType: input.activityType,
        status: ATTEMPT_STATUS.PROCESSING,
        idempotencyKey: input.idempotencyKey,
        reservationExpiresAt,
        targetSnapshot:
          payload.kind === 'word' || payload.kind === 'sentence'
            ? payload.targetText
            : null,
        questionSnapshot:
          payload.kind === 'guided' ? payload.questionText : null,
        engine: 'openai',
        model,
        promptVersion: access.config.promptVersion,
      },
    });
    const reservedCount = quota.reservedCount + 1;
    await tx.dailySpeakingUsage.update({
      where: { id: quota.id },
      data: {
        reservedCount,
        status: DAILY_USAGE_STATUS.RESERVED,
        sessionId: session.id,
        reservedUntil: reservationExpiresAt,
      },
    });

    return {
      kind: 'reserved',
      attemptId: attempt.id,
      sessionId: session.id,
      payload,
      config: access.config,
      promptVersion: access.config.promptVersion,
    };
  });
}

export async function completeSpeakingDrillAttempt(input: {
  attemptId: string;
  userId: string;
  transcript: string;
  score: number;
  details: Record<string, unknown>;
  feedback: Record<string, unknown>;
  audioMimeType: string;
  audioBytes: number;
  audioDurationMs: number;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  estimatedCostUsd?: number | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    await lockDrillUser(tx, input.userId);
    const initial = await tx.speakingAttempt.findUnique({
      where: { id: input.attemptId },
      include: {
        session: true,
        course: { select: { name: true, levelName: true } },
        question: { select: { sortOrder: true } },
        scoreLog: true,
      },
    });
    if (!initial || initial.userId !== input.userId) {
      throw new DrillAttemptError(
        'ATTEMPT_NOT_FOUND',
        'Speaking attempt was not found.',
        404,
      );
    }
    await lockQuota(
      tx,
      input.userId,
      initial.activityType as SpeakingDrillActivityType,
    );
    const attempt = await tx.speakingAttempt.findUnique({
      where: { id: input.attemptId },
      include: {
        session: true,
        course: { select: { name: true, levelName: true } },
        question: { select: { sortOrder: true } },
        scoreLog: true,
      },
    });
    if (!attempt || attempt.userId !== input.userId) {
      throw new DrillAttemptError(
        'ATTEMPT_NOT_FOUND',
        'Speaking attempt was not found.',
        404,
      );
    }
    if (attempt.status === ATTEMPT_STATUS.COMPLETED) {
      return { attempt, idempotent: true };
    }
    if (attempt.status !== ATTEMPT_STATUS.PROCESSING) {
      throw new DrillAttemptError(
        'ATTEMPT_NOT_COMPLETABLE',
        'Speaking attempt cannot be completed.',
      );
    }

    const activityType = attempt.activityType as SpeakingDrillActivityType;
    const usageDateVN = usageDateToUtcMidnight(usageDateString(now));
    const originalQuota = attempt.session.quotaUsageId
      ? await tx.dailySpeakingUsage.findUnique({
          where: { id: attempt.session.quotaUsageId },
        })
      : null;
    let quota = originalQuota;
    if (!quota || quota.usageDateVN.getTime() !== usageDateVN.getTime()) {
      if (quota) await decrementReservation(tx, quota.id);
      const config = await tx.speakingActivityConfig.findUnique({
        where: { activityType },
      });
      if (!config?.enabled) {
        throw new DrillAttemptError(
          'ACTIVITY_CONFIG_UNAVAILABLE',
          'Speaking activity configuration is unavailable.',
          503,
        );
      }
      quota = await ensureQuota(tx, {
        userId: input.userId,
        usageDateVN,
        activityType,
        limit: config.dailyLimit,
      });
      if (quota.usedCount + quota.reservedCount >= quota.limitSnapshot) {
        throw new DrillAttemptError(
          'DAILY_SPEAKING_LIMIT_REACHED',
          'You have used all Speaking turns for today.',
        );
      }
    }
    if (quota.usedCount >= quota.limitSnapshot) {
      throw new DrillAttemptError(
        'DAILY_SPEAKING_LIMIT_REACHED',
        'You have used all Speaking turns for today.',
      );
    }

    const reservedCount =
      originalQuota?.id === quota.id
        ? Math.max(0, quota.reservedCount - 1)
        : quota.reservedCount;
    const usedCount = quota.usedCount + 1;
    await tx.dailySpeakingUsage.update({
      where: { id: quota.id },
      data: {
        usedCount,
        reservedCount,
        status: legacyStatus(usedCount, reservedCount, quota.limitSnapshot),
        sessionId: attempt.sessionId,
        ...(reservedCount === 0 ? { reservedUntil: null } : {}),
      },
    });

    const practiceScore = speakingDrillPracticeScore(
      input.score,
      input.audioDurationMs,
    );
    const scoreLog = await tx.scoreLog.create({
      data: {
        userId: input.userId,
        course: progressCourseKey(
          attempt.course.name,
          attempt.course.levelName,
        ),
        game: 'speaking_drill',
        questionIndex: Math.max(0, attempt.question.sortOrder),
        isCorrect: practiceScore.isCorrect,
        elapsedMs: practiceScore.elapsedMs,
        points: practiceScore.points,
        countsForCourseTotal: false,
      },
    });
    const completed = await tx.speakingAttempt.update({
      where: { id: attempt.id },
      data: {
        status: ATTEMPT_STATUS.COMPLETED,
        serverTranscript: input.transcript,
        score: practiceScore.score,
        scoreLogId: scoreLog.id,
        details: {
          ...input.details,
          practiceScoring: {
            correctThreshold: SPEAKING_DRILL_CORRECT_THRESHOLD,
            isCorrect: practiceScore.isCorrect,
            points: practiceScore.points,
          },
        } as Prisma.InputJsonValue,
        feedback: input.feedback as Prisma.InputJsonValue,
        audioMimeType: input.audioMimeType,
        audioBytes: input.audioBytes,
        audioDurationMs: input.audioDurationMs,
        engine: 'openai',
        model: input.model,
        inputTokens: Math.max(0, input.inputTokens ?? 0),
        outputTokens: Math.max(0, input.outputTokens ?? 0),
        audioInputTokens: Math.max(0, input.audioInputTokens ?? 0),
        audioOutputTokens: Math.max(0, input.audioOutputTokens ?? 0),
        estimatedCostUsd: input.estimatedCostUsd ?? null,
        completedAt: now,
        failedAt: null,
        failureCode: null,
      },
      include: { scoreLog: true },
    });
    await tx.speakingSession.update({
      where: { id: attempt.sessionId },
      data: {
        status: SPEAKING_SESSION_STATUS.SUBMITTED,
        startedAt: attempt.session.startedAt ?? attempt.createdAt,
        endedAt: now,
        usageCountedAt: now,
        reservationExpiresAt: null,
        quotaUsageId: quota.id,
        transcript: { text: input.transcript, source: 'server_transcription' },
        model: input.model,
        inputTokens: Math.max(0, input.inputTokens ?? 0),
        outputTokens: Math.max(0, input.outputTokens ?? 0),
        audioInputTokens: Math.max(0, input.audioInputTokens ?? 0),
        audioOutputTokens: Math.max(0, input.audioOutputTokens ?? 0),
        estimatedCostUsd: input.estimatedCostUsd ?? null,
      },
    });

    // Short drills never create or schedule SpeakingSessionEndJob rows.
    return { attempt: completed, idempotent: false };
  });
}

export async function failSpeakingDrillAttempt(input: {
  attemptId: string;
  userId: string;
  failureCode: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    await lockDrillUser(tx, input.userId);
    const initial = await tx.speakingAttempt.findUnique({
      where: { id: input.attemptId },
      include: { session: true },
    });
    if (!initial || initial.userId !== input.userId) {
      return { released: false };
    }
    await lockQuota(
      tx,
      input.userId,
      initial.activityType as SpeakingDrillActivityType,
    );
    const attempt = await tx.speakingAttempt.findUnique({
      where: { id: input.attemptId },
      include: { session: true },
    });
    if (!attempt || attempt.userId !== input.userId) {
      return { released: false };
    }
    if (
      attempt.status === ATTEMPT_STATUS.COMPLETED ||
      attempt.status === ATTEMPT_STATUS.FAILED
    ) {
      return { released: false };
    }
    if (
      !attempt.session.usageCountedAt &&
      attempt.session.quotaUsageId
    ) {
      await decrementReservation(tx, attempt.session.quotaUsageId);
    }
    await tx.speakingAttempt.update({
      where: { id: attempt.id },
      data: {
        status: ATTEMPT_STATUS.FAILED,
        failedAt: now,
        failureCode: input.failureCode.slice(0, 100),
      },
    });
    await tx.speakingSession.update({
      where: { id: attempt.sessionId },
      data: {
        status: SPEAKING_SESSION_STATUS.FAILED,
        endedAt: now,
        failedAt: now,
        failureStage: 'SHORT_DRILL',
        failureCode: input.failureCode.slice(0, 100),
        errorMessage: 'Short drill processing failed without counting quota',
        reservationExpiresAt: null,
      },
    });
    return { released: true };
  });
}
