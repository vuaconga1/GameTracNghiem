import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireSession = vi.fn();
const evaluateSpeakingAccess = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}));

vi.mock('@/lib/speaking/access', () => ({
  evaluateSpeakingAccess: (...args: unknown[]) =>
    evaluateSpeakingAccess(...args),
}));

import { SpeakingDrillRoute } from './SpeakingDrillRoute';

describe('SpeakingDrillRoute access boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops at authentication and does not evaluate activity access for Guest', async () => {
    requireSession.mockRejectedValue(new Error('Chưa đăng nhập'));

    await expect(
      SpeakingDrillRoute({
        courseId: 'course-1',
        activityType: 'WORD_PRONUNCIATION',
      }),
    ).rejects.toThrow('Chưa đăng nhập');
    expect(evaluateSpeakingAccess).not.toHaveBeenCalled();
  });

  it('passes the activity-specific lock reason to the protected shell', async () => {
    const session = {
      userId: 'student-1',
      username: 'student-1',
      displayName: 'Student',
      role: 'student',
    };
    requireSession.mockResolvedValue(session);
    evaluateSpeakingAccess.mockResolvedValue({
      allowed: false,
      reason: 'FEATURE_DISABLED',
    });

    const element = await SpeakingDrillRoute({
      courseId: 'course-1',
      activityType: 'SENTENCE_READING',
    });

    expect(evaluateSpeakingAccess).toHaveBeenCalledWith({
      session,
      courseId: 'course-1',
      activityType: 'SENTENCE_READING',
    });
    expect(element.props).toMatchObject({
      courseId: 'course-1',
      activityType: 'SENTENCE_READING',
      accessReason: 'FEATURE_DISABLED',
    });
  });
});
