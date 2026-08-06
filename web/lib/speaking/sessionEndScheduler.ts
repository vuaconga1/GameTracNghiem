import 'server-only';

import { timingSafeEqual } from 'crypto';

import { Client, Receiver } from '@upstash/qstash';

import { prisma } from '@/lib/db';
import { SPEAKING_SESSION_STATUS } from '@/lib/speaking/config';
import { hangupRealtimeCall } from '@/lib/speaking/openaiRealtime';
import { verifySpeakingInternalCallback } from '@/lib/speaking/security';

const CALLBACK_PATH = '/api/internal/speaking/session-end';
const PROCESSING_LOCK_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 1000;
const MAX_BATCH_SIZE = 50;

export const SESSION_END_JOB_STATUS = {
  PENDING: 'PENDING',
  DISPATCHED: 'DISPATCHED',
  PROCESSING: 'PROCESSING',
  RETRY: 'RETRY',
  COMPLETED: 'COMPLETED',
} as const;

type SchedulerMode = 'qstash' | 'local';

type SchedulerConfig = {
  mode: SchedulerMode;
  callbackUrl: string | null;
  token: string | null;
  currentSigningKey: string | null;
  nextSigningKey: string | null;
};

type CallbackVerificationInput = {
  body: string;
  signature: string | null;
  authorization: string | null;
  requestUrl: string;
  upstashRegion?: string | null;
  internalSignature?: string | null;
};

export class SessionEndSchedulerError extends Error {
  status = 503;

  constructor(message: string) {
    super(message);
    this.name = 'SessionEndSchedulerError';
  }
}

function normalizedBaseUrl(value: string | undefined) {
  const raw = value?.trim().replace(/\/+$/, '');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function getSessionEndSchedulerConfig(): SchedulerConfig {
  const configuredMode = process.env.SPEAKING_SESSION_END_SCHEDULER
    ?.trim()
    .toLowerCase();
  const mode =
    configuredMode === 'qstash' || configuredMode === 'local'
      ? configuredMode
      : null;

  if (!mode) {
    throw new SessionEndSchedulerError(
      'Thiếu SPEAKING_SESSION_END_SCHEDULER (qstash hoặc local)',
    );
  }
  if (mode === 'local') {
    if (process.env.NODE_ENV === 'production') {
      throw new SessionEndSchedulerError(
        'SPEAKING_SESSION_END_SCHEDULER=local không được phép ở production',
      );
    }
    return {
      mode,
      callbackUrl: null,
      token: null,
      currentSigningKey: null,
      nextSigningKey: null,
    };
  }

  const callbackBaseUrl = normalizedBaseUrl(
    process.env.SPEAKING_PUBLIC_BASE_URL,
  );
  const token = process.env.QSTASH_TOKEN?.trim() || null;
  const currentSigningKey =
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() || null;
  const nextSigningKey =
    process.env.QSTASH_NEXT_SIGNING_KEY?.trim() || null;
  if (!callbackBaseUrl || !token || !currentSigningKey || !nextSigningKey) {
    throw new SessionEndSchedulerError(
      'QStash chưa cấu hình đủ SPEAKING_PUBLIC_BASE_URL, token và signing keys',
    );
  }

  return {
    mode,
    callbackUrl: `${callbackBaseUrl}${CALLBACK_PATH}`,
    token,
    currentSigningKey,
    nextSigningKey,
  };
}

/** Called before creating an OpenAI call so production fails closed. */
export function assertSessionEndSchedulerReady() {
  return getSessionEndSchedulerConfig();
}

function safeSecretEquals(received: string, expected: string) {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

export function isCronRequestAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authorization = request.headers.get('authorization') || '';
  return (
    authorization.startsWith('Bearer ') &&
    safeSecretEquals(authorization.slice(7), secret)
  );
}

export async function verifySessionEndCallback(
  input: CallbackVerificationInput,
) {
  const config = getSessionEndSchedulerConfig();
  if (config.mode === 'local') {
    return verifySpeakingInternalCallback({
      body: input.body,
      signature: input.internalSignature ?? null,
      secret: process.env.SPEAKING_INTERNAL_CALLBACK_SECRET,
    });
  }

  if (!input.signature || !config.currentSigningKey || !config.nextSigningKey) {
    return false;
  }
  const receiver = new Receiver({
    currentSigningKey: config.currentSigningKey,
    nextSigningKey: config.nextSigningKey,
  });
  try {
    return await receiver.verify({
      body: input.body,
      signature: input.signature,
      url: config.callbackUrl || input.requestUrl,
      upstashRegion: input.upstashRegion || undefined,
      clockTolerance: 5,
    });
  } catch {
    return false;
  }
}

const schedulerGlobal = globalThis as unknown as {
  speakingSessionEndTimers?: Map<string, ReturnType<typeof setTimeout>>;
};

function scheduleLocalCallback(job: { id: string; dueAt: Date }) {
  const timers =
    schedulerGlobal.speakingSessionEndTimers ??
    new Map<string, ReturnType<typeof setTimeout>>();
  schedulerGlobal.speakingSessionEndTimers = timers;
  if (timers.has(job.id)) return;

  const delay = Math.max(0, Math.min(2_147_000_000, job.dueAt.getTime() - Date.now()));
  const timer = setTimeout(() => {
    timers.delete(job.id);
    void processSessionEndJob({ jobId: job.id }).catch((error) => {
      console.error('[speaking] local session hard-stop failed', error);
    });
  }, delay);
  timer.unref?.();
  timers.set(job.id, timer);
}

export async function dispatchSessionEndJob(jobId: string) {
  const config = getSessionEndSchedulerConfig();
  const job = await prisma.speakingSessionEndJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      sessionId: true,
      dueAt: true,
      status: true,
      providerMessageId: true,
    },
  });
  if (!job || job.status === SESSION_END_JOB_STATUS.COMPLETED) {
    return { dispatched: false, job };
  }
  if (
    job.status === SESSION_END_JOB_STATUS.DISPATCHED &&
    job.providerMessageId
  ) {
    return { dispatched: false, job };
  }

  try {
    let providerMessageId: string;
    if (config.mode === 'local') {
      scheduleLocalCallback(job);
      providerMessageId = `local:${job.id}`;
    } else {
      const client = new Client({ token: config.token! });
      const delaySeconds = Math.max(
        0,
        Math.ceil((job.dueAt.getTime() - Date.now()) / 1000),
      );
      const result = await client.publishJSON({
        url: config.callbackUrl!,
        body: { jobId: job.id, sessionId: job.sessionId },
        delay: delaySeconds,
        retries: 5,
        retryDelay: 'max(1000, pow(2, retried) * 1000)',
        // QStash rejects ':' in deduplicationId ("DeduplicationId cannot contain ':'").
        deduplicationId: `speaking-session-end-${job.id}`,
      });
      providerMessageId = result.messageId;
    }

    const updated = await prisma.speakingSessionEndJob.update({
      where: { id: job.id },
      data: {
        status: SESSION_END_JOB_STATUS.DISPATCHED,
        provider: config.mode === 'qstash' ? 'QSTASH' : 'LOCAL',
        providerMessageId,
        dispatchAttempts: { increment: 1 },
        lastAttemptAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
        dispatchedAt: new Date(),
      },
    });
    return { dispatched: true, job: updated };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không dispatch được hard-stop job';
    await prisma.speakingSessionEndJob.update({
      where: { id: job.id },
      data: {
        status: SESSION_END_JOB_STATUS.PENDING,
        dispatchAttempts: { increment: 1 },
        lastAttemptAt: new Date(),
        nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
        lastError: message.slice(0, 1000),
      },
    });
    throw error;
  }
}

export async function dispatchSessionEndJobForSession(sessionId: string) {
  const job = await prisma.speakingSessionEndJob.findUnique({
    where: { sessionId },
    select: { id: true },
  });
  if (!job) {
    throw new SessionEndSchedulerError('Phiên đã bắt đầu nhưng thiếu hard-stop job');
  }
  return dispatchSessionEndJob(job.id);
}

function callbackError(status: number, message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

const TERMINAL_SESSION_STATUSES = new Set<string>([
  SPEAKING_SESSION_STATUS.SUBMITTED,
  SPEAKING_SESSION_STATUS.INTERRUPTED,
  SPEAKING_SESSION_STATUS.FAILED,
]);

export async function processSessionEndJob(input: {
  jobId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const job = await prisma.speakingSessionEndJob.findUnique({
    where: { id: input.jobId },
    include: { session: true },
  });
  if (!job) throw callbackError(404, 'Không tìm thấy hard-stop job');
  if (job.status === SESSION_END_JOB_STATUS.COMPLETED) {
    return { completed: true, alreadyCompleted: true, sessionId: job.sessionId };
  }

  const mustEndAt = job.session.mustEndAt ?? job.dueAt;
  if (now.getTime() < mustEndAt.getTime()) {
    throw callbackError(425, 'Hard-stop callback đến trước mustEndAt');
  }

  const staleLockBefore = new Date(now.getTime() - PROCESSING_LOCK_MS);
  const claimed = await prisma.speakingSessionEndJob.updateMany({
    where: {
      id: job.id,
      OR: [
        {
          status: {
            in: [
              SESSION_END_JOB_STATUS.PENDING,
              SESSION_END_JOB_STATUS.DISPATCHED,
              SESSION_END_JOB_STATUS.RETRY,
            ],
          },
        },
        {
          status: SESSION_END_JOB_STATUS.PROCESSING,
          lockedAt: { lte: staleLockBefore },
        },
      ],
    },
    data: {
      status: SESSION_END_JOB_STATUS.PROCESSING,
      lockedAt: now,
      lastAttemptAt: now,
      processAttempts: { increment: 1 },
    },
  });
  if (claimed.count === 0) {
    throw callbackError(409, 'Hard-stop job đang được xử lý');
  }

  try {
    if (
      !TERMINAL_SESSION_STATUSES.has(job.session.status) &&
      job.session.openaiCallId
    ) {
      await hangupRealtimeCall(job.session.openaiCallId);
    }

    await prisma.$transaction(async (tx) => {
      if (!TERMINAL_SESSION_STATUSES.has(job.session.status)) {
        await tx.speakingSession.updateMany({
          where: {
            id: job.session.id,
            status: {
              in: [
                SPEAKING_SESSION_STATUS.ACTIVE,
                SPEAKING_SESSION_STATUS.FINISHING,
                SPEAKING_SESSION_STATUS.UPLOADING,
                SPEAKING_SESSION_STATUS.UPLOAD_FAILED,
              ],
            },
          },
          data: {
            status: SPEAKING_SESSION_STATUS.FINISHING,
            endedAt: job.session.endedAt ?? now,
          },
        });
      }
      await tx.speakingSessionEndJob.update({
        where: { id: job.id },
        data: {
          status: SESSION_END_JOB_STATUS.COMPLETED,
          completedAt: now,
          lockedAt: null,
          nextAttemptAt: null,
          lastError: null,
        },
      });
    });

    return {
      completed: true,
      alreadyCompleted: false,
      sessionId: job.sessionId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Hard-stop OpenAI thất bại';
    await prisma.speakingSessionEndJob.update({
      where: { id: job.id },
      data: {
        status: SESSION_END_JOB_STATUS.RETRY,
        lockedAt: null,
        nextAttemptAt: new Date(now.getTime() + RETRY_DELAY_MS),
        lastError: message.slice(0, 1000),
      },
    });
    throw error;
  }
}

export async function dispatchPendingSessionEndJobs(now = new Date()) {
  const jobs = await prisma.speakingSessionEndJob.findMany({
    where: {
      status: {
        in: [SESSION_END_JOB_STATUS.PENDING, SESSION_END_JOB_STATUS.RETRY],
      },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { dueAt: 'asc' },
    take: MAX_BATCH_SIZE,
    select: { id: true },
  });
  const results = await Promise.allSettled(
    jobs.map((job) => dispatchSessionEndJob(job.id)),
  );
  return {
    found: jobs.length,
    dispatched: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

/** Cron backup: recreate missing outbox rows and directly expire overdue calls. */
export async function sweepOverdueSpeakingSessions(now = new Date()) {
  const sessions = await prisma.speakingSession.findMany({
    where: {
      activityType: 'REALTIME_CONVERSATION',
      status: SPEAKING_SESSION_STATUS.ACTIVE,
      mustEndAt: { lte: now },
    },
    orderBy: { mustEndAt: 'asc' },
    take: MAX_BATCH_SIZE,
    select: { id: true, mustEndAt: true },
  });

  const jobIds: string[] = [];
  for (const session of sessions) {
    if (!session.mustEndAt) continue;
    const job = await prisma.speakingSessionEndJob.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        dueAt: session.mustEndAt,
        status: SESSION_END_JOB_STATUS.PENDING,
      },
      update: { dueAt: session.mustEndAt },
      select: { id: true },
    });
    jobIds.push(job.id);
  }

  const results = await Promise.allSettled(
    jobIds.map((jobId) => processSessionEndJob({ jobId, now })),
  );
  return {
    overdue: sessions.length,
    expired: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}
