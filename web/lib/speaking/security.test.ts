import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
  assertSpeakingMutationRequest,
  nextSpeakingBurstState,
  signSpeakingInternalCallback,
  verifySpeakingInternalCallback,
} from '@/lib/speaking/security';

describe('Speaking mutation security', () => {
  it('requires the CSRF header and rejects a cross-origin request', () => {
    expect(() =>
      assertSpeakingMutationRequest(
        new Request('https://app.example/api/speaking/sessions', {
          method: 'POST',
          headers: { Origin: 'https://evil.example' },
        }),
      ),
    ).toThrow(/không hợp lệ|khác nguồn/i);

    expect(() =>
      assertSpeakingMutationRequest(
        new Request('https://app.example/api/speaking/sessions', {
          method: 'POST',
          headers: {
            Origin: 'https://evil.example',
            'x-wewin-csrf': '1',
          },
        }),
      ),
    ).toThrow(/khác nguồn/i);
  });

  it('accepts the non-simple header from the same origin', () => {
    expect(() =>
      assertSpeakingMutationRequest(
        new Request('https://app.example/api/speaking/sessions', {
          method: 'POST',
          headers: {
            Origin: 'https://app.example',
            'Sec-Fetch-Site': 'same-origin',
            'x-wewin-csrf': '1',
          },
        }),
      ),
    ).not.toThrow();
  });

  it('blocks the seventh expensive session-create request in one minute', () => {
    const now = new Date('2026-08-06T05:00:00.000Z');
    let state:
      | { count: number; expiresAt: Date; windowStartedAt: Date }
      | undefined;
    for (let index = 0; index < 6; index += 1) {
      state = nextSpeakingBurstState({
        action: 'SESSION_CREATE',
        now,
        existing: state,
      });
    }
    expect(state?.count).toBe(6);
    expect(() =>
      nextSpeakingBurstState({
        action: 'SESSION_CREATE',
        now,
        existing: state,
      }),
    ).toThrow(/quá nhanh/i);
  });

  it('signs internal callback bytes and rejects tampering', () => {
    const body = '{"jobId":"job-1"}';
    const secret = 'test-secret-at-least-32-characters';
    const signature = signSpeakingInternalCallback(body, secret);
    expect(
      verifySpeakingInternalCallback({ body, signature, secret }),
    ).toBe(true);
    expect(
      verifySpeakingInternalCallback({
        body: '{"jobId":"job-2"}',
        signature,
        secret,
      }),
    ).toBe(false);
  });
});
