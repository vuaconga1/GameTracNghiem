import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorized: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('@/lib/speaking/sessionEndScheduler', () => ({
  isCronRequestAuthorized: (...args: unknown[]) => mocks.authorized(...args),
}));
vi.mock('@/lib/speaking/recordingRetention', () => ({
  cleanupDueSpeakingRecordings: (...args: unknown[]) => mocks.cleanup(...args),
}));

import { GET } from '@/app/api/cron/speaking-recordings/route';

describe('Speaking recording cleanup cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cleanup.mockResolvedValue({ found: 2, deleted: 2, failed: 0 });
  });

  it('rejects requests without CRON_SECRET authorization', async () => {
    mocks.authorized.mockReturnValue(false);
    const response = await GET(
      new Request('https://app.example/api/cron/speaking-recordings'),
    );
    expect(response.status).toBe(401);
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });

  it('runs cleanup for an authorized Vercel cron request', async () => {
    mocks.authorized.mockReturnValue(true);
    const response = await GET(
      new Request('https://app.example/api/cron/speaking-recordings', {
        headers: { Authorization: 'Bearer cron-secret' },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      cleanup: { deleted: 2, failed: 0 },
    });
  });
});
