import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  findUnique: vi.fn(),
  evaluateSpeakingAccess: vi.fn(),
  finish: vi.fn(),
  release: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => mocks.requireSession(...args),
}));
vi.mock('@/lib/db', () => ({
  prisma: { speakingSession: { findUnique: mocks.findUnique } },
}));
vi.mock('@/lib/speaking/access', () => ({
  evaluateSpeakingAccess: (...args: unknown[]) =>
    mocks.evaluateSpeakingAccess(...args),
  SPEAKING_ACCESS_REASON: { DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED' },
  SpeakingAccessError: class SpeakingAccessError extends Error {},
}));
vi.mock('@/lib/speaking/realtimeFinish', () => ({
  finishRealtimeSpeakingSession: (...args: unknown[]) => mocks.finish(...args),
}));
vi.mock('@/lib/speaking/usage', () => ({
  releaseReservationOnFailure: (...args: unknown[]) => mocks.release(...args),
}));

import { POST } from '@/app/api/speaking/sessions/[id]/finish/route';

const activeSession = {
  id: 'session-1',
  userId: 'student-1',
  courseId: 'course-1',
  activityType: 'REALTIME_CONVERSATION',
  kind: 'STUDENT_PRACTICE',
  status: 'ACTIVE',
  transcript: null,
};

describe('POST /api/speaking/sessions/:id/finish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue({
      userId: 'student-1',
      role: 'student',
    });
    mocks.findUnique.mockResolvedValue(activeSession);
    mocks.evaluateSpeakingAccess.mockResolvedValue({ allowed: true });
    mocks.finish.mockResolvedValue({
      points: 30,
      scored: true,
      session: {
        id: 'session-1',
        status: 'FINISHING',
        endedAt: new Date('2026-08-06T04:01:35.000Z'),
      },
    });
  });

  it('returns the server-created Realtime practice points', async () => {
    const response = await POST(
      new Request('http://localhost/api/speaking/sessions/session-1/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: { text: 'hello' } }),
      }),
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      points: 30,
      scored: true,
      session: { status: 'FINISHING' },
    });
    expect(mocks.finish).toHaveBeenCalledWith({
      sessionId: 'session-1',
      userId: 'student-1',
      transcript: { text: 'hello' },
    });
  });

  it('releases a failed-before-start reservation without scoring', async () => {
    mocks.findUnique.mockResolvedValue({
      ...activeSession,
      status: 'RESERVED',
    });
    mocks.release.mockResolvedValue({
      released: true,
      session: { id: 'session-1', status: 'FAILED' },
    });

    const response = await POST(
      new Request('http://localhost/api/speaking/sessions/session-1/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failed: true }),
      }),
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(mocks.finish).not.toHaveBeenCalled();
  });
});
