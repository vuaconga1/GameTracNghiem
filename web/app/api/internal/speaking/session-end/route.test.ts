import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifySessionEndCallback = vi.fn();
const processSessionEndJob = vi.fn();

vi.mock('@/lib/speaking/sessionEndScheduler', () => ({
  verifySessionEndCallback: (...args: unknown[]) =>
    verifySessionEndCallback(...args),
  processSessionEndJob: (...args: unknown[]) => processSessionEndJob(...args),
}));

import { POST } from '@/app/api/internal/speaking/session-end/route';

describe('POST /api/internal/speaking/session-end', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processSessionEndJob.mockResolvedValue({
      completed: true,
      alreadyCompleted: false,
      sessionId: 'session-1',
    });
  });

  it('rejects an unsigned callback before processing', async () => {
    verifySessionEndCallback.mockResolvedValue(false);
    const response = await POST(
      new Request('https://app.example/api/internal/speaking/session-end', {
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-1' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(processSessionEndJob).not.toHaveBeenCalled();
  });

  it('passes the exact raw signed body into idempotent processing', async () => {
    verifySessionEndCallback.mockResolvedValue(true);
    const rawBody = JSON.stringify({
      jobId: 'job-1',
      sessionId: 'session-1',
    });
    const response = await POST(
      new Request('https://app.example/api/internal/speaking/session-end', {
        method: 'POST',
        headers: { 'Upstash-Signature': 'signed-jwt' },
        body: rawBody,
      }),
    );

    expect(response.status).toBe(200);
    expect(verifySessionEndCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        body: rawBody,
        signature: 'signed-jwt',
      }),
    );
    expect(processSessionEndJob).toHaveBeenCalledWith({ jobId: 'job-1' });
  });
});
