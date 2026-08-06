import { beforeEach, describe, expect, it, vi } from 'vitest';

const isCronRequestAuthorized = vi.fn();
const assertSessionEndSchedulerReady = vi.fn();
const sweepOverdueSpeakingSessions = vi.fn();
const dispatchPendingSessionEndJobs = vi.fn();

vi.mock('@/lib/speaking/sessionEndScheduler', () => ({
  isCronRequestAuthorized: (...args: unknown[]) =>
    isCronRequestAuthorized(...args),
  assertSessionEndSchedulerReady: (...args: unknown[]) =>
    assertSessionEndSchedulerReady(...args),
  sweepOverdueSpeakingSessions: (...args: unknown[]) =>
    sweepOverdueSpeakingSessions(...args),
  dispatchPendingSessionEndJobs: (...args: unknown[]) =>
    dispatchPendingSessionEndJobs(...args),
}));

import { GET } from '@/app/api/cron/speaking-session-ends/route';

describe('GET /api/cron/speaking-session-ends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sweepOverdueSpeakingSessions.mockResolvedValue({
      overdue: 1,
      expired: 1,
      failed: 0,
    });
    dispatchPendingSessionEndJobs.mockResolvedValue({
      found: 1,
      dispatched: 1,
      failed: 0,
    });
  });

  it('rejects requests without CRON_SECRET authentication', async () => {
    isCronRequestAuthorized.mockReturnValue(false);
    const response = await GET(
      new Request('https://app.example/api/cron/speaking-session-ends'),
    );
    expect(response.status).toBe(401);
    expect(sweepOverdueSpeakingSessions).not.toHaveBeenCalled();
  });

  it('sweeps overdue sessions before retrying pending dispatches', async () => {
    isCronRequestAuthorized.mockReturnValue(true);
    const response = await GET(
      new Request('https://app.example/api/cron/speaking-session-ends', {
        headers: { Authorization: 'Bearer cron-secret' },
      }),
    );

    expect(response.status).toBe(200);
    expect(assertSessionEndSchedulerReady).toHaveBeenCalledOnce();
    expect(sweepOverdueSpeakingSessions).toHaveBeenCalledBefore(
      dispatchPendingSessionEndJobs,
    );
  });
});
