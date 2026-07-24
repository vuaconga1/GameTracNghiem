import { describe, expect, it } from 'vitest';

import {
  nextAvailableAt,
  usageDateString,
  usageDateToUtcMidnight,
  canStartNewSession,
  buildDailyUsageResponse,
} from '@/lib/speaking/dates';

describe('speaking dates (Asia/Ho_Chi_Minh)', () => {
  it('maps UTC evening before VN midnight to previous VN date', () => {
    // 2026-07-23 17:00 UTC = 2026-07-24 00:00 VN
    const atVnMidnight = new Date('2026-07-23T17:00:00.000Z');
    expect(usageDateString(atVnMidnight)).toBe('2026-07-24');
  });

  it('maps one ms before VN midnight to previous day', () => {
    // 2026-07-23 16:59:59.999 UTC = 2026-07-23 23:59:59.999 VN
    const before = new Date('2026-07-23T16:59:59.999Z');
    expect(usageDateString(before)).toBe('2026-07-23');
  });

  it('maps just after VN midnight to new day', () => {
    const after = new Date('2026-07-23T17:00:00.001Z');
    expect(usageDateString(after)).toBe('2026-07-24');
  });

  it('computes nextAvailableAt as next VN midnight in UTC', () => {
    const duringDay = new Date('2026-07-24T05:30:00.000Z'); // 12:30 VN
    expect(usageDateString(duringDay)).toBe('2026-07-24');
    const next = nextAvailableAt(duringDay);
    expect(next.toISOString()).toBe('2026-07-24T17:00:00.000Z');
  });

  it('usageDateToUtcMidnight round-trips', () => {
    const midnight = usageDateToUtcMidnight('2026-07-24');
    expect(midnight.toISOString()).toBe('2026-07-23T17:00:00.000Z');
    expect(usageDateString(midnight)).toBe('2026-07-24');
  });
});

describe('canStartNewSession', () => {
  const now = new Date('2026-07-24T05:00:00.000Z');

  it('allows AVAILABLE and missing usage', () => {
    expect(canStartNewSession(null, null, now)).toBe(true);
    expect(canStartNewSession('AVAILABLE', null, now)).toBe(true);
  });

  it('blocks CONSUMED', () => {
    expect(canStartNewSession('CONSUMED', null, now)).toBe(false);
  });

  it('blocks active reservation; allows expired', () => {
    expect(canStartNewSession('RESERVED', new Date('2026-07-24T06:00:00.000Z'), now)).toBe(
      false
    );
    expect(canStartNewSession('RESERVED', new Date('2026-07-24T04:00:00.000Z'), now)).toBe(
      true
    );
  });

  it('buildDailyUsageResponse sets nextAvailableAt only when consumed', () => {
    const consumed = buildDailyUsageResponse({ status: 'CONSUMED', now });
    expect(consumed.canStart).toBe(false);
    expect(consumed.usedToday).toBe(1);
    expect(consumed.nextAvailableAt).toBe('2026-07-24T17:00:00.000Z');

    const free = buildDailyUsageResponse({ status: 'AVAILABLE', now });
    expect(free.canStart).toBe(true);
    expect(free.nextAvailableAt).toBeNull();
  });
});
