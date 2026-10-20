import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorized: vi.fn(),
  send: vi.fn(),
}));

vi.mock('@/lib/speaking/sessionEndScheduler', () => ({
  isCronRequestAuthorized: (...args: unknown[]) => mocks.authorized(...args),
}));
vi.mock('@/lib/sendGradeAccessReport', () => ({
  sendGradeAccessReport: (...args: unknown[]) => mocks.send(...args),
}));

import { GET } from '@/app/api/cron/access-report/route';

describe('GET /api/cron/access-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({ weekStart: '2026-10-12' });
  });

  it('rejects requests without the cron secret', async () => {
    mocks.authorized.mockReturnValue(false);
    const response = await GET(new Request('https://app.example/api/cron/access-report'));
    expect(response.status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends the report when the cron secret matches', async () => {
    mocks.authorized.mockReturnValue(true);
    const response = await GET(
      new Request('https://app.example/api/cron/access-report', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
});
