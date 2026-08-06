import { beforeEach, describe, expect, it, vi } from 'vitest';

const optionalSession = vi.fn();
const evaluateSpeakingAccess = vi.fn();

vi.mock('@/lib/auth', () => ({
  optionalSession: (...args: unknown[]) => optionalSession(...args),
}));

vi.mock('@/lib/speaking/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/speaking/access')>();
  return {
    ...actual,
    evaluateSpeakingAccess: (...args: unknown[]) => evaluateSpeakingAccess(...args),
  };
});

import { GET } from '@/app/api/speaking/access/route';

describe('GET /api/speaking/access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optionalSession.mockResolvedValue(null);
  });

  it('returns a stable anonymous decision without PII or transcript data', async () => {
    evaluateSpeakingAccess.mockResolvedValue({
      allowed: false,
      reason: 'LOGIN_REQUIRED',
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
      timezone: 'Asia/Ho_Chi_Minh',
      config: null,
      entitlementExpiresAt: null,
    });
    const response = await GET(
      new Request(
        'http://localhost/api/speaking/access?courseId=course-1&activityType=REALTIME_CONVERSATION',
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      access: { allowed: false, reason: 'LOGIN_REQUIRED' },
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(json)).not.toMatch(/username|displayName|transcript|recording/i);
  });

  it('rejects unknown activity types before evaluating access', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/speaking/access?courseId=course-1&activityType=UNKNOWN',
      ),
    );
    expect(response.status).toBe(400);
    expect(evaluateSpeakingAccess).not.toHaveBeenCalled();
  });
});
