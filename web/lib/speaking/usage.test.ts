import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => {
  const speakingSession = {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  };
  const speakingTopic = {
    findFirst: vi.fn(),
  };
  const dailySpeakingUsage = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  };
  const dailySpeakingUsageRelease = {
    create: vi.fn(),
  };

  return {
    prisma: {
      speakingSession,
      speakingTopic,
      dailySpeakingUsage,
      dailySpeakingUsageRelease,
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
        fn({
          speakingSession,
          speakingTopic,
          dailySpeakingUsage,
          dailySpeakingUsageRelease,
          $executeRaw: vi.fn().mockResolvedValue(undefined),
        })
      ),
      $executeRaw: vi.fn(),
    },
  };
});

import { prisma } from '@/lib/db';
import {
  SpeakingLimitError,
  SpeakingConflictError,
  createPracticeSession,
  markSessionStarted,
  createPreviewSession,
} from '@/lib/speaking/usage';
import { DAILY_USAGE_STATUS, SPEAKING_SESSION_KIND } from '@/lib/speaking/config';

const tx = {
  speakingSession: prisma.speakingSession,
  speakingTopic: prisma.speakingTopic,
  dailySpeakingUsage: prisma.dailySpeakingUsage,
  dailySpeakingUsageRelease: prisma.dailySpeakingUsageRelease,
  $executeRaw: vi.fn().mockResolvedValue(undefined),
};

describe('createPracticeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx)
    );
    (tx.speakingTopic.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'topic1',
      title: 'T',
      instructions: 'I',
      durationSeconds: 300,
      courseId: 'c1',
    });
    (tx.speakingSession.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sess1',
      status: 'RESERVED',
      kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
    });
    (tx.dailySpeakingUsage.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'usage1',
      status: DAILY_USAGE_STATUS.RESERVED,
      sessionId: 'sess1',
    });
  });

  it('creates session when no usage yet', async () => {
    (tx.dailySpeakingUsage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await createPracticeSession({ userId: 'u1', topicId: 'topic1' });
    expect(result.session.id).toBe('sess1');
    expect(tx.dailySpeakingUsage.upsert).toHaveBeenCalled();
  });

  it('returns 409 when already consumed', async () => {
    (tx.dailySpeakingUsage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'usage1',
      status: DAILY_USAGE_STATUS.CONSUMED,
      sessionId: 'old',
      reservedUntil: null,
    });
    await expect(
      createPracticeSession({ userId: 'u1', topicId: 'topic1' })
    ).rejects.toBeInstanceOf(SpeakingLimitError);
  });

  it('returns conflict when reservation still active', async () => {
    const now = new Date('2026-07-24T05:00:00.000Z');
    (tx.dailySpeakingUsage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'usage1',
      status: DAILY_USAGE_STATUS.RESERVED,
      sessionId: 'other',
      reservedUntil: new Date('2026-07-24T05:30:00.000Z'),
    });
    await expect(
      createPracticeSession({ userId: 'u1', topicId: 'topic1', now })
    ).rejects.toBeInstanceOf(SpeakingConflictError);
  });

  it('reclaims expired reservation', async () => {
    const now = new Date('2026-07-24T05:00:00.000Z');
    (tx.dailySpeakingUsage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'usage1',
      status: DAILY_USAGE_STATUS.RESERVED,
      sessionId: 'old-sess',
      reservedUntil: new Date('2026-07-24T04:50:00.000Z'),
    });
    (tx.speakingSession.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await createPracticeSession({ userId: 'u1', topicId: 'topic1', now });
    expect(tx.speakingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'old-sess' },
        data: expect.objectContaining({ status: 'INTERRUPTED' }),
      })
    );
  });

  it('404 when topic inactive', async () => {
    (tx.speakingTopic.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      createPracticeSession({ userId: 'u1', topicId: 'missing' })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('markSessionStarted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx)
    );
  });

  it('consumes usage once and is idempotent', async () => {
    (tx.speakingSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sess1',
      userId: 'u1',
      kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
      status: 'RESERVED',
      startedAt: null,
    });
    (tx.speakingSession.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sess1',
      status: 'ACTIVE',
      startedAt: new Date(),
    });
    (tx.dailySpeakingUsage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'usage1',
      status: DAILY_USAGE_STATUS.RESERVED,
      sessionId: 'sess1',
    });
    (tx.dailySpeakingUsage.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const first = await markSessionStarted({ sessionId: 'sess1', userId: 'u1' });
    expect(first.alreadyStarted).toBe(false);
    expect(tx.dailySpeakingUsage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DAILY_USAGE_STATUS.CONSUMED }),
      })
    );

    (tx.speakingSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sess1',
      userId: 'u1',
      kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
      status: 'ACTIVE',
      startedAt: new Date(),
    });
    const second = await markSessionStarted({ sessionId: 'sess1', userId: 'u1' });
    expect(second.alreadyStarted).toBe(true);
  });

  it('404 when session belongs to another user', async () => {
    (tx.speakingSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sess1',
      userId: 'other',
      kind: SPEAKING_SESSION_KIND.STUDENT_PRACTICE,
      status: 'RESERVED',
    });
    await expect(
      markSessionStarted({ sessionId: 'sess1', userId: 'u1' })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('createPreviewSession', () => {
  it('does not touch daily usage', async () => {
    (prisma.speakingTopic.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'topic1',
      title: 'T',
      instructions: 'I',
      durationSeconds: 300,
      courseId: 'c1',
      active: true,
    });
    (prisma.speakingSession.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'preview1',
      kind: SPEAKING_SESSION_KIND.ADMIN_PREVIEW,
      status: 'RESERVED',
    });

    const result = await createPreviewSession({ userId: 'admin1', topicId: 'topic1' });
    expect(result.session.kind).toBe(SPEAKING_SESSION_KIND.ADMIN_PREVIEW);
    expect(prisma.dailySpeakingUsage.upsert).not.toHaveBeenCalled();
    expect(prisma.dailySpeakingUsage.create).not.toHaveBeenCalled();
  });
});
