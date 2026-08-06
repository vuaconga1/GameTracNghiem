import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  publishJSON: vi.fn(),
  receiverVerify: vi.fn(),
  jobFindUnique: vi.fn(),
  jobUpdate: vi.fn(),
  jobUpdateMany: vi.fn(),
  sessionUpdateMany: vi.fn(),
  hangupRealtimeCall: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@upstash/qstash', () => ({
  Client: class Client {
    publishJSON = mocks.publishJSON;
  },
  Receiver: class Receiver {
    verify = mocks.receiverVerify;
  },
}));
vi.mock('@/lib/speaking/openaiRealtime', () => ({
  hangupRealtimeCall: (...args: unknown[]) =>
    mocks.hangupRealtimeCall(...args),
}));
vi.mock('@/lib/db', () => {
  const transactionClient = {
    speakingSession: { updateMany: mocks.sessionUpdateMany },
    speakingSessionEndJob: { update: mocks.jobUpdate },
  };
  return {
    prisma: {
      speakingSessionEndJob: {
        findUnique: mocks.jobFindUnique,
        update: mocks.jobUpdate,
        updateMany: mocks.jobUpdateMany,
        findMany: vi.fn(),
      },
      speakingSession: { findMany: vi.fn() },
      $transaction: (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transactionClient),
    },
  };
});

import {
  assertSessionEndSchedulerReady,
  dispatchSessionEndJob,
  processSessionEndJob,
  verifySessionEndCallback,
} from '@/lib/speaking/sessionEndScheduler';

const dueAt = new Date('2026-08-06T03:03:00.000Z');

describe('durable Speaking hard-stop scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.SPEAKING_SESSION_END_SCHEDULER = 'qstash';
    process.env.SPEAKING_PUBLIC_BASE_URL = 'https://app.example';
    process.env.QSTASH_TOKEN = 'qstash-token';
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-key';
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-key';
    process.env.CRON_SECRET = 'cron-secret';
    mocks.publishJSON.mockResolvedValue({ messageId: 'msg-1' });
    mocks.jobUpdate.mockResolvedValue({ id: 'job-1' });
    mocks.jobUpdateMany.mockResolvedValue({ count: 1 });
    mocks.sessionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.hangupRealtimeCall.mockResolvedValue({ closed: true, status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('fails closed in production when durable QStash config is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SPEAKING_SESSION_END_SCHEDULER', 'qstash');
    vi.stubEnv('QSTASH_TOKEN', '');

    expect(() => assertSessionEndSchedulerReady()).toThrow(
      'QStash chưa cấu hình đủ',
    );
  });

  it('publishes a delayed, deduplicated QStash callback', async () => {
    mocks.jobFindUnique.mockResolvedValue({
      id: 'job-1',
      sessionId: 'session-1',
      dueAt,
      status: 'PENDING',
      providerMessageId: null,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T03:00:00.000Z'));

    await dispatchSessionEndJob('job-1');

    expect(mocks.publishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://app.example/api/internal/speaking/session-end',
        body: { jobId: 'job-1', sessionId: 'session-1' },
        delay: 180,
        deduplicationId: 'speaking-session-end:job-1',
        retries: 5,
      }),
    );
    expect(mocks.jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DISPATCHED',
          providerMessageId: 'msg-1',
        }),
      }),
    );
  });

  it('verifies the exact callback URL and raw body', async () => {
    mocks.receiverVerify.mockResolvedValue(true);
    await expect(
      verifySessionEndCallback({
        body: '{"jobId":"job-1"}',
        signature: 'signed-jwt',
        authorization: null,
        requestUrl: 'https://internal-alias.example/callback',
      }),
    ).resolves.toBe(true);

    expect(mocks.receiverVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '{"jobId":"job-1"}',
        signature: 'signed-jwt',
        url: 'https://app.example/api/internal/speaking/session-end',
      }),
    );
  });

  it('hangs up and closes an overdue active session exactly once', async () => {
    mocks.jobFindUnique
      .mockResolvedValueOnce({
        id: 'job-1',
        sessionId: 'session-1',
        dueAt,
        status: 'DISPATCHED',
        session: {
          id: 'session-1',
          status: 'ACTIVE',
          mustEndAt: dueAt,
          openaiCallId: 'rtc_location_123',
          endedAt: null,
        },
      })
      .mockResolvedValueOnce({
        id: 'job-1',
        sessionId: 'session-1',
        dueAt,
        status: 'COMPLETED',
        session: {
          id: 'session-1',
          status: 'FINISHING',
          mustEndAt: dueAt,
          openaiCallId: 'rtc_location_123',
          endedAt: dueAt,
        },
      });
    const now = new Date('2026-08-06T03:03:01.000Z');

    await processSessionEndJob({ jobId: 'job-1', now });
    await processSessionEndJob({ jobId: 'job-1', now });

    expect(mocks.hangupRealtimeCall).toHaveBeenCalledTimes(1);
    expect(mocks.hangupRealtimeCall).toHaveBeenCalledWith('rtc_location_123');
    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FINISHING',
          endedAt: now,
        }),
      }),
    );
    expect(mocks.jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });
});
