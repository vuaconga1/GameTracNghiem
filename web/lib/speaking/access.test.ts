import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFindUnique = vi.fn();
const courseFindUnique = vi.fn();
const configFindUnique = vi.fn();
const entitlementFindMany = vi.fn();
const usageFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    course: { findUnique: (...args: unknown[]) => courseFindUnique(...args) },
    speakingActivityConfig: {
      findUnique: (...args: unknown[]) => configFindUnique(...args),
    },
    speakingEntitlement: {
      findMany: (...args: unknown[]) => entitlementFindMany(...args),
    },
    dailySpeakingUsage: {
      findUnique: (...args: unknown[]) => usageFindUnique(...args),
    },
  },
}));

import {
  evaluateSpeakingAccess,
  SPEAKING_ACCESS_REASON,
} from '@/lib/speaking/access';

const studentSession = {
  userId: 'student-1',
  username: 'WeWIN01-HV-1602',
  displayName: 'Học sinh',
  role: 'student' as const,
};
const now = new Date('2026-08-06T03:00:00.000Z'); // 10:00 Asia/Ho_Chi_Minh

describe('evaluateSpeakingAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPEAKING_EMERGENCY_DISABLED;
    userFindUnique.mockResolvedValue({
      role: 'student',
      archivedAt: null,
      portalLinkedAt: new Date('2026-08-01T00:00:00.000Z'),
      speakingAccountStatus: 'ACTIVE',
    });
    courseFindUnique.mockResolvedValue({
      active: true,
      archivedAt: null,
      enabledSkills: ['speaking'],
    });
    configFindUnique.mockResolvedValue({
      enabled: true,
      dailyLimit: 2,
      durationSeconds: 180,
      reservationTtlSeconds: 120,
      promptVersion: 'v1',
    });
    entitlementFindMany.mockResolvedValue([
      {
        status: 'ACTIVE',
        startsAt: new Date('2026-07-31T17:00:00.000Z'),
        expiresAt: new Date('2026-08-31T17:00:00.000Z'),
      },
    ]);
    usageFindUnique.mockResolvedValue(null);
  });

  it('returns LOGIN_REQUIRED without querying student data', async () => {
    const access = await evaluateSpeakingAccess({
      session: null,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.LOGIN_REQUIRED);
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('fails closed before DB access when the global emergency switch is on', async () => {
    process.env.SPEAKING_EMERGENCY_DISABLED = 'true';
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access).toMatchObject({
      allowed: false,
      reason: SPEAKING_ACCESS_REASON.FEATURE_DISABLED,
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('fails closed when the per-activity DB switch is off', async () => {
    configFindUnique.mockResolvedValue({
      enabled: false,
      dailyLimit: 2,
      durationSeconds: 180,
      reservationTtlSeconds: 120,
      promptVersion: 'v1',
    });
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.FEATURE_DISABLED);
  });

  it('requires successful Parent Portal linkage', async () => {
    userFindUnique.mockResolvedValue({
      role: 'student',
      archivedAt: null,
      portalLinkedAt: null,
      speakingAccountStatus: 'ACTIVE',
    });
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.NOT_WEWIN_STUDENT);
  });

  it('blocks suspended Speaking accounts', async () => {
    userFindUnique.mockResolvedValue({
      role: 'student',
      archivedAt: null,
      portalLinkedAt: new Date(),
      speakingAccountStatus: 'SUSPENDED',
    });
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.ACCOUNT_SUSPENDED);
  });

  it('requires an active course with Speaking enabled', async () => {
    courseFindUnique.mockResolvedValue({
      active: true,
      archivedAt: null,
      enabledSkills: ['reading'],
    });
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.FEATURE_DISABLED);
  });

  it('treats expiresAt as an exclusive Asia/Ho_Chi_Minh boundary', async () => {
    entitlementFindMany.mockResolvedValue([
      {
        status: 'ACTIVE',
        startsAt: new Date('2026-07-31T17:00:00.000Z'),
        // 2026-08-06 00:00:00 in Asia/Ho_Chi_Minh
        expiresAt: new Date('2026-08-05T17:00:00.000Z'),
      },
    ]);
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now: new Date('2026-08-05T17:00:00.000Z'),
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.COURSE_EXPIRED);
  });

  it('allows a linked, entitled student and exposes only safe config', async () => {
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access).toMatchObject({
      allowed: true,
      reason: SPEAKING_ACCESS_REASON.ALLOWED,
      config: {
        dailyLimit: 2,
        durationSeconds: 180,
        reservationTtlSeconds: 120,
        promptVersion: 'v1',
      },
      quota: {
        activityType: 'REALTIME_CONVERSATION',
        used: 0,
        reserved: 0,
        limit: 2,
        remaining: 2,
      },
    });
    expect(JSON.stringify(access)).not.toContain(studentSession.username);
  });

  it('allows the second start and blocks after exactly two counted starts', async () => {
    usageFindUnique.mockResolvedValue({
      usedCount: 1,
      reservedCount: 0,
      limitSnapshot: 2,
    });
    const second = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(second.reason).toBe(SPEAKING_ACCESS_REASON.ALLOWED);
    expect(second.quota?.remaining).toBe(1);

    usageFindUnique.mockResolvedValue({
      usedCount: 2,
      reservedCount: 0,
      limitSnapshot: 2,
    });
    const access = await evaluateSpeakingAccess({
      session: studentSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      now,
    });
    expect(access.reason).toBe(SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED);
    expect(access.quota?.remaining).toBe(0);
  });
});
