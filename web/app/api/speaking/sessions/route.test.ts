import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  topicFindFirst: vi.fn(),
  assertSpeakingAccess: vi.fn(),
  createPracticeSession: vi.fn(),
  trackSpeakingEvent: vi.fn(),
  assertSpeakingMutationRequest: vi.fn(),
  enforceSpeakingBurstLimit: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => mocks.requireSession(...args),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    speakingTopic: {
      findFirst: (...args: unknown[]) => mocks.topicFindFirst(...args),
    },
  },
}));
vi.mock('@/lib/speaking/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/speaking/access')>();
  return {
    ...actual,
    assertSpeakingAccess: (...args: unknown[]) =>
      mocks.assertSpeakingAccess(...args),
  };
});
vi.mock('@/lib/speaking/analytics', () => ({
  trackSpeakingEvent: (...args: unknown[]) => mocks.trackSpeakingEvent(...args),
}));
vi.mock('@/lib/speaking/security', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/speaking/security')>();
  return {
    ...actual,
    assertSpeakingMutationRequest: (...args: unknown[]) =>
      mocks.assertSpeakingMutationRequest(...args),
    enforceSpeakingBurstLimit: (...args: unknown[]) =>
      mocks.enforceSpeakingBurstLimit(...args),
  };
});
vi.mock('@/lib/speaking/usage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/speaking/usage')>();
  return {
    ...actual,
    createPracticeSession: (...args: unknown[]) =>
      mocks.createPracticeSession(...args),
  };
});

import { POST } from '@/app/api/speaking/sessions/route';

const authSession = {
  userId: 'student-1',
  username: 'student',
  displayName: 'Student',
  role: 'student',
};

function request(body: unknown = { topicId: 'topic-1' }) {
  return new Request('http://localhost/api/speaking/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wewin-csrf': '1',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/speaking/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(authSession);
    mocks.enforceSpeakingBurstLimit.mockResolvedValue({ count: 1 });
    mocks.topicFindFirst.mockResolvedValue({ courseId: 'course-1' });
    mocks.assertSpeakingAccess.mockResolvedValue({
      allowed: true,
      config: {
        dailyLimit: 2,
        durationSeconds: 180,
        reservationTtlSeconds: 120,
        promptVersion: 'v1',
      },
    });
    mocks.createPracticeSession.mockResolvedValue({
      session: {
        id: 'session-1',
        status: 'RESERVED',
        kind: 'STUDENT_PRACTICE',
      },
      topic: {
        id: 'topic-1',
        title: 'Safe mock topic',
        durationSeconds: 300,
      },
      reservedUntil: new Date('2026-08-06T03:02:00.000Z'),
    });
  });

  it('checks access before creating a 180-second reservation', async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.assertSpeakingAccess).toHaveBeenCalledWith({
      session: authSession,
      courseId: 'course-1',
      activityType: 'REALTIME_CONVERSATION',
    });
    expect(mocks.createPracticeSession).toHaveBeenCalledWith({
      userId: 'student-1',
      topicId: 'topic-1',
      courseId: 'course-1',
    });
    expect(body).toMatchObject({
      success: true,
      session: { id: 'session-1', status: 'RESERVED' },
      topic: { id: 'topic-1', durationSeconds: 180 },
    });
  });

  it('does not reserve or call an external provider when access is denied', async () => {
    mocks.assertSpeakingAccess.mockRejectedValue(
      Object.assign(new Error('Entitlement expired'), { status: 403 }),
    );

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.createPracticeSession).not.toHaveBeenCalled();
    expect(mocks.trackSpeakingEvent).not.toHaveBeenCalled();
  });

  it('rejects a missing topic before any reservation', async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(mocks.topicFindFirst).not.toHaveBeenCalled();
    expect(mocks.createPracticeSession).not.toHaveBeenCalled();
  });
});
