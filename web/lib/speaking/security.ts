import { createHmac, timingSafeEqual } from 'crypto';

import { prisma } from '@/lib/db';

export const SPEAKING_CSRF_HEADER = 'x-wewin-csrf';
export const SPEAKING_CSRF_VALUE = '1';

export class SpeakingSecurityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'SpeakingSecurityError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Speaking mutations require a non-simple header and reject cross-origin
 * browser requests. The custom header forces a CORS preflight for attackers.
 */
export function assertSpeakingMutationRequest(request: Request): void {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const requestUrl = new URL(request.url);
  const localTestRequest =
    process.env.NODE_ENV !== 'production' &&
    (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1') &&
    !request.headers.has('origin') &&
    !request.headers.has('sec-fetch-site');
  if (localTestRequest && !request.headers.has(SPEAKING_CSRF_HEADER)) return;

  if (request.headers.get(SPEAKING_CSRF_HEADER) !== SPEAKING_CSRF_VALUE) {
    throw new SpeakingSecurityError(
      'CSRF_CHECK_FAILED',
      'Yêu cầu Speaking không hợp lệ',
      403,
    );
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') {
    throw new SpeakingSecurityError(
      'CSRF_CHECK_FAILED',
      'Yêu cầu khác nguồn bị từ chối',
      403,
    );
  }

  const origin = request.headers.get('origin');
  if (origin) {
    let expectedOrigin: string;
    try {
      expectedOrigin = requestUrl.origin;
    } catch {
      throw new SpeakingSecurityError(
        'CSRF_CHECK_FAILED',
        'URL yêu cầu không hợp lệ',
        403,
      );
    }
    if (origin !== expectedOrigin) {
      throw new SpeakingSecurityError(
        'CSRF_CHECK_FAILED',
        'Yêu cầu khác nguồn bị từ chối',
        403,
      );
    }
  }
}

export type SpeakingBurstAction =
  | 'SESSION_CREATE'
  | 'REALTIME_CONNECT'
  | 'DRILL_ASSESS';

const BURST_RULES: Record<
  SpeakingBurstAction,
  { limit: number; windowMs: number }
> = {
  SESSION_CREATE: { limit: 6, windowMs: 60_000 },
  REALTIME_CONNECT: { limit: 8, windowMs: 60_000 },
  DRILL_ASSESS: { limit: 10, windowMs: 60_000 },
};

export function nextSpeakingBurstState(input: {
  action: SpeakingBurstAction;
  now: Date;
  existing?: { count: number; expiresAt: Date; windowStartedAt: Date } | null;
}) {
  const rule = BURST_RULES[input.action];
  if (
    !input.existing ||
    input.existing.expiresAt.getTime() <= input.now.getTime()
  ) {
    return {
      count: 1,
      windowStartedAt: input.now,
      expiresAt: new Date(input.now.getTime() + rule.windowMs),
    };
  }
  if (input.existing.count >= rule.limit) {
    throw new SpeakingSecurityError(
      'SPEAKING_BURST_LIMIT',
      'Thao tác Speaking quá nhanh, vui lòng thử lại sau',
      429,
    );
  }
  return {
    count: input.existing.count + 1,
    windowStartedAt: input.existing.windowStartedAt,
    expiresAt: input.existing.expiresAt,
  };
}

/** Durable per-user burst limiter for expensive Speaking operations. */
export async function enforceSpeakingBurstLimit(input: {
  userId: string;
  action: SpeakingBurstAction;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const key = `${input.userId}:${input.action}`;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`speaking-burst:${key}`}))`;
    const existing = await tx.speakingBurstLimit.findUnique({ where: { key } });
    const next = nextSpeakingBurstState({
      action: input.action,
      now,
      existing,
    });
    if (!existing) {
      return tx.speakingBurstLimit.create({
        data: {
          key,
          userId: input.userId,
          action: input.action,
          ...next,
        },
      });
    }
    if (existing.expiresAt.getTime() <= now.getTime()) {
      return tx.speakingBurstLimit.update({
        where: { key },
        data: {
          ...next,
        },
      });
    }
    return tx.speakingBurstLimit.update({
      where: { key },
      data: { count: next.count },
    });
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function signSpeakingInternalCallback(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifySpeakingInternalCallback(input: {
  body: string;
  signature: string | null;
  secret: string | undefined;
}): boolean {
  const secret = input.secret?.trim();
  const signature = input.signature?.trim();
  if (!secret || !signature) return false;
  return safeEqual(signSpeakingInternalCallback(input.body, secret), signature);
}
