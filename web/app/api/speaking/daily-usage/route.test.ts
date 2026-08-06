import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireSession = vi.fn();
const evaluateSpeakingAccess = vi.fn();
const configFindMany = vi.fn();
const usageFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    speakingActivityConfig: {
      findMany: (...args: unknown[]) => configFindMany(...args),
    },
    dailySpeakingUsage: {
      findMany: (...args: unknown[]) => usageFindMany(...args),
    },
  },
}));
vi.mock('@/lib/speaking/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/speaking/access')>();
  return {
    ...actual,
    evaluateSpeakingAccess: (...args: unknown[]) =>
      evaluateSpeakingAccess(...args),
  };
});
vi.mock('@/lib/speaking/recordingStorage', () => ({
  speakingRecordingPublicUrl: (sessionId: string) =>
    `/api/speaking/sessions/${sessionId}/recording`,
}));

import { GET } from '@/app/api/speaking/daily-usage/route';

describe('GET /api/speaking/daily-usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({
      userId: 'student-1',
      username: 'student',
      displayName: 'Student',
      role: 'student',
    });
    evaluateSpeakingAccess.mockResolvedValue({
      allowed: true,
      reason: 'ALLOWED',
    });
    configFindMany.mockResolvedValue([
      { activityType: 'REALTIME_CONVERSATION', dailyLimit: 2 },
      { activityType: 'WORD_PRONUNCIATION', dailyLimit: 30 },
    ]);
    usageFindMany.mockResolvedValue([
      {
        activityType: 'REALTIME_CONVERSATION',
        usedCount: 1,
        reservedCount: 0,
        limitSnapshot: 2,
        reservedUntil: null,
        sessionId: 'session-1',
        session: {
          id: 'session-1',
          status: 'SUBMITTED',
          recordingUrl: null,
          recordingKey: null,
        },
      },
    ]);
  });

  it('returns per-activity counts and current UI aliases', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/speaking/daily-usage?courseId=course-1',
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      activityType: 'REALTIME_CONVERSATION',
      used: 1,
      limit: 2,
      remaining: 1,
      usedToday: 1,
      dailyLimit: 2,
      remainingToday: 1,
      canStart: true,
      activities: {
        REALTIME_CONVERSATION: { used: 1, limit: 2, remaining: 1 },
        WORD_PRONUNCIATION: { used: 0, limit: 30, remaining: 30 },
      },
    });
  });
});
