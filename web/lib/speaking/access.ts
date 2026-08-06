import type { SessionPayload } from '@/lib/session';
import { prisma } from '@/lib/db';
import { resolveEnabledSkillIds } from '@/lib/skillCatalog';
import {
  SPEAKING_ACCOUNT_STATUS,
  SPEAKING_ACTIVITY_TYPES,
  SPEAKING_ENTITLEMENT_STATUS,
  isSpeakingEmergencyDisabled,
  type SpeakingActivityType,
} from '@/lib/speaking/config';
import { usageDateString, usageDateToUtcMidnight } from '@/lib/speaking/dates';

export const SPEAKING_ACCESS_REASON = {
  ALLOWED: 'ALLOWED',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  NOT_WEWIN_STUDENT: 'NOT_WEWIN_STUDENT',
  NO_ACTIVE_COURSE: 'NO_ACTIVE_COURSE',
  COURSE_EXPIRED: 'COURSE_EXPIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
} as const;

export type SpeakingAccessReason =
  (typeof SPEAKING_ACCESS_REASON)[keyof typeof SPEAKING_ACCESS_REASON];

export type SpeakingAccessConfig = {
  dailyLimit: number;
  durationSeconds: number;
  reservationTtlSeconds: number;
  promptVersion: string;
};

export type SpeakingQuotaSnapshot = {
  activityType: SpeakingActivityType;
  used: number;
  reserved: number;
  limit: number;
  remaining: number;
};

export type SpeakingAccessResult = {
  allowed: boolean;
  reason: SpeakingAccessReason;
  courseId: string;
  activityType: SpeakingActivityType;
  timezone: 'Asia/Ho_Chi_Minh';
  config: SpeakingAccessConfig | null;
  quota: SpeakingQuotaSnapshot | null;
  entitlementExpiresAt: string | null;
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type SpeakingAccessDb = Pick<
  Tx,
  | 'user'
  | 'course'
  | 'speakingActivityConfig'
  | 'speakingEntitlement'
  | 'dailySpeakingUsage'
>;

type AccessInput = {
  session: SessionPayload | null;
  courseId: string;
  activityType: SpeakingActivityType;
  now?: Date;
  db?: SpeakingAccessDb;
};

type EntitlementRow = {
  status: string;
  startsAt: Date;
  expiresAt: Date;
};

function result(
  input: AccessInput,
  reason: SpeakingAccessReason,
  config: SpeakingAccessConfig | null = null,
  entitlementExpiresAt: Date | null = null,
  quota: SpeakingQuotaSnapshot | null = null,
): SpeakingAccessResult {
  return {
    allowed: reason === SPEAKING_ACCESS_REASON.ALLOWED,
    reason,
    courseId: input.courseId,
    activityType: input.activityType,
    timezone: 'Asia/Ho_Chi_Minh',
    config,
    quota,
    entitlementExpiresAt: entitlementExpiresAt?.toISOString() ?? null,
  };
}

function hasActiveEntitlement(row: EntitlementRow, now: Date): boolean {
  return (
    row.status === SPEAKING_ENTITLEMENT_STATUS.ACTIVE &&
    row.startsAt.getTime() <= now.getTime() &&
    now.getTime() < row.expiresAt.getTime()
  );
}

function hasExpiredEntitlement(rows: EntitlementRow[], now: Date): boolean {
  return rows.some(
    (row) =>
      row.status === SPEAKING_ENTITLEMENT_STATUS.EXPIRED ||
      (row.status === SPEAKING_ENTITLEMENT_STATUS.ACTIVE &&
        row.expiresAt.getTime() <= now.getTime()),
  );
}

/**
 * Resolve student access from local PostgreSQL only.
 *
 * Entitlement intervals are [startsAt, expiresAt). Admin date-only values are
 * converted from Asia/Ho_Chi_Minh midnight before storage, so comparing their
 * instants here preserves the local-calendar boundary without server-TZ drift.
 */
export async function evaluateSpeakingAccess(
  input: AccessInput,
): Promise<SpeakingAccessResult> {
  const now = input.now ?? new Date();
  const db = input.db ?? prisma;
  if (!input.session) {
    return result(input, SPEAKING_ACCESS_REASON.LOGIN_REQUIRED);
  }
  if (input.session.role !== 'student') {
    return result(input, SPEAKING_ACCESS_REASON.NOT_WEWIN_STUDENT);
  }
  if (isSpeakingEmergencyDisabled()) {
    return result(input, SPEAKING_ACCESS_REASON.FEATURE_DISABLED);
  }

  const usageDateVN = usageDateToUtcMidnight(usageDateString(now));
  const [user, course, activityConfig, entitlements, usage] = await Promise.all([
    db.user.findUnique({
      where: { id: input.session.userId },
      select: {
        role: true,
        archivedAt: true,
        portalLinkedAt: true,
        speakingAccountStatus: true,
      },
    }),
    db.course.findUnique({
      where: { id: input.courseId },
      select: {
        active: true,
        archivedAt: true,
        enabledSkills: true,
      },
    }),
    db.speakingActivityConfig.findUnique({
      where: { activityType: input.activityType },
      select: {
        enabled: true,
        dailyLimit: true,
        durationSeconds: true,
        reservationTtlSeconds: true,
        promptVersion: true,
      },
    }),
    db.speakingEntitlement.findMany({
      where: {
        userId: input.session.userId,
        OR: [{ courseId: input.courseId }, { courseId: null }],
      },
      select: {
        status: true,
        startsAt: true,
        expiresAt: true,
      },
      orderBy: { expiresAt: 'desc' },
    }),
    db.dailySpeakingUsage.findUnique({
      where: {
        userId_usageDateVN_activityType: {
          userId: input.session.userId,
          usageDateVN,
          activityType: input.activityType,
        },
      },
      select: {
        usedCount: true,
        reservedCount: true,
        limitSnapshot: true,
      },
    }),
  ]);

  if (!user || user.archivedAt) {
    return result(input, SPEAKING_ACCESS_REASON.LOGIN_REQUIRED);
  }
  if (user.role !== 'student' || !user.portalLinkedAt) {
    return result(input, SPEAKING_ACCESS_REASON.NOT_WEWIN_STUDENT);
  }
  if (user.speakingAccountStatus !== SPEAKING_ACCOUNT_STATUS.ACTIVE) {
    return result(input, SPEAKING_ACCESS_REASON.ACCOUNT_SUSPENDED);
  }
  if (!course || !course.active || course.archivedAt) {
    return result(input, SPEAKING_ACCESS_REASON.NO_ACTIVE_COURSE);
  }
  if (!resolveEnabledSkillIds(course.enabledSkills).includes('speaking')) {
    return result(input, SPEAKING_ACCESS_REASON.FEATURE_DISABLED);
  }
  if (!activityConfig?.enabled) {
    return result(input, SPEAKING_ACCESS_REASON.FEATURE_DISABLED);
  }

  const limit = Math.max(1, usage?.limitSnapshot ?? activityConfig.dailyLimit);
  const quota: SpeakingQuotaSnapshot = {
    activityType: input.activityType,
    used: Math.max(0, usage?.usedCount ?? 0),
    reserved: Math.max(0, usage?.reservedCount ?? 0),
    limit,
    remaining: Math.max(0, limit - (usage?.usedCount ?? 0)),
  };
  const config: SpeakingAccessConfig = {
    dailyLimit: limit,
    durationSeconds: activityConfig.durationSeconds,
    reservationTtlSeconds: activityConfig.reservationTtlSeconds,
    promptVersion: activityConfig.promptVersion,
  };
  const activeEntitlement = entitlements.find((row) => hasActiveEntitlement(row, now));
  if (!activeEntitlement) {
    return result(
      input,
      hasExpiredEntitlement(entitlements, now)
        ? SPEAKING_ACCESS_REASON.COURSE_EXPIRED
        : SPEAKING_ACCESS_REASON.NO_ACTIVE_COURSE,
      config,
      null,
      quota,
    );
  }

  if (quota.used >= quota.limit) {
    return result(
      input,
      SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED,
      config,
      activeEntitlement.expiresAt,
      quota,
    );
  }

  return result(
    input,
    SPEAKING_ACCESS_REASON.ALLOWED,
    config,
    activeEntitlement.expiresAt,
    quota,
  );
}

export class SpeakingAccessError extends Error {
  readonly code: SpeakingAccessReason;
  readonly status: number;
  readonly access: SpeakingAccessResult;

  constructor(access: SpeakingAccessResult) {
    super(accessReasonMessage(access.reason));
    this.name = 'SpeakingAccessError';
    this.code = access.reason;
    this.status =
      access.reason === SPEAKING_ACCESS_REASON.LOGIN_REQUIRED
        ? 401
        : access.reason === SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED
          ? 409
          : 403;
    this.access = access;
  }
}

export async function assertSpeakingAccess(
  input: AccessInput,
): Promise<SpeakingAccessResult> {
  const access = await evaluateSpeakingAccess(input);
  if (!access.allowed) throw new SpeakingAccessError(access);
  return access;
}

export function accessReasonMessage(reason: SpeakingAccessReason): string {
  const messages: Record<SpeakingAccessReason, string> = {
    ALLOWED: 'Được phép sử dụng Speaking',
    LOGIN_REQUIRED: 'Vui lòng đăng nhập để sử dụng Speaking',
    NOT_WEWIN_STUDENT: 'Tài khoản chưa được liên kết với học sinh WeWIN',
    NO_ACTIVE_COURSE: 'Chưa có quyền Speaking cho khóa học này',
    COURSE_EXPIRED: 'Quyền Speaking cho khóa học đã hết hạn',
    ACCOUNT_SUSPENDED: 'Tài khoản Speaking đang bị tạm ngưng',
    FEATURE_DISABLED: 'Hoạt động Speaking hiện chưa được bật',
    DAILY_LIMIT_REACHED: 'Bạn đã dùng hết lượt Speaking hôm nay',
  };
  return messages[reason];
}

export { SPEAKING_ACTIVITY_TYPES };
