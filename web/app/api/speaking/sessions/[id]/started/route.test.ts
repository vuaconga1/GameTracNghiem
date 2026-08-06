import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireSession = vi.fn();
const markSessionStarted = vi.fn();
const assertSessionEndSchedulerReady = vi.fn();
const dispatchSessionEndJobForSession = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}));
vi.mock('@/lib/speaking/usage', () => ({
  SpeakingConflictError: class SpeakingConflictError extends Error {},
  SpeakingLimitError: class SpeakingLimitError extends Error {},
  markSessionStarted: (...args: unknown[]) => markSessionStarted(...args),
}));
vi.mock('@/lib/speaking/sessionEndScheduler', () => ({
  assertSessionEndSchedulerReady: (...args: unknown[]) =>
    assertSessionEndSchedulerReady(...args),
  dispatchSessionEndJobForSession: (...args: unknown[]) =>
    dispatchSessionEndJobForSession(...args),
}));

import { POST } from '@/app/api/speaking/sessions/[id]/started/route';

describe('POST /api/speaking/sessions/:id/started', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({
      userId: 'student-1',
      username: 'student',
      displayName: 'Student',
      role: 'student',
    });
    markSessionStarted.mockResolvedValue({
      alreadyStarted: false,
      session: {
        id: 'session-1',
        status: 'ACTIVE',
        startedAt: new Date('2026-08-06T03:00:00.000Z'),
        mustEndAt: new Date('2026-08-06T03:03:00.000Z'),
        usageCountedAt: new Date('2026-08-06T03:00:00.000Z'),
      },
    });
    dispatchSessionEndJobForSession.mockResolvedValue({ dispatched: true });
  });

  it('passes the stable Idempotency-Key into transactional finalization', async () => {
    const response = await POST(
      new Request('http://localhost/api/speaking/sessions/session-1/started', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'stable-start-key' },
      }),
      { params: Promise.resolve({ id: 'session-1' }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(markSessionStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'student-1',
        idempotencyKey: 'stable-start-key',
      }),
    );
    expect(json.session.mustEndAt).toBe('2026-08-06T03:03:00.000Z');
    expect(assertSessionEndSchedulerReady).toHaveBeenCalledOnce();
    expect(dispatchSessionEndJobForSession).toHaveBeenCalledWith('session-1');
  });

  it('returns the service idempotency result unchanged on retry', async () => {
    markSessionStarted.mockResolvedValueOnce({
      alreadyStarted: true,
      session: {
        id: 'session-1',
        status: 'ACTIVE',
        startedAt: new Date('2026-08-06T03:00:00.000Z'),
        mustEndAt: new Date('2026-08-06T03:03:00.000Z'),
        usageCountedAt: new Date('2026-08-06T03:00:00.000Z'),
      },
    });
    const response = await POST(
      new Request('http://localhost/api/speaking/sessions/session-1/started', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'stable-start-key' },
      }),
      { params: Promise.resolve({ id: 'session-1' }) },
    );
    expect(await response.json()).toMatchObject({
      success: true,
      alreadyStarted: true,
      session: { id: 'session-1', status: 'ACTIVE' },
    });
  });
});
