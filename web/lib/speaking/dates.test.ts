import { describe, expect, it } from 'vitest';

import {
  nextAvailableAt,
  usageDateString,
  usageDateToUtcMidnight,
  parseHoChiMinhDateBoundary,
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

  it('represents a VN calendar label at UTC midnight for PostgreSQL DATE', () => {
    const midnight = usageDateToUtcMidnight('2026-07-24');
    expect(midnight.toISOString()).toBe('2026-07-24T00:00:00.000Z');
    expect(usageDateString(midnight)).toBe('2026-07-24');
  });

  it('parses strict admin date boundaries at Vietnam midnight', () => {
    expect(parseHoChiMinhDateBoundary('2026-08-06')?.toISOString()).toBe(
      '2026-08-05T17:00:00.000Z'
    );
    expect(parseHoChiMinhDateBoundary('2026-02-30')).toBeNull();
    expect(parseHoChiMinhDateBoundary('06/08/2026')).toBeNull();
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

  it('buildDailyUsageResponse exposes V2 counts and compatibility aliases', () => {
    const consumed = buildDailyUsageResponse({
      usedCount: 2,
      reservedCount: 0,
      limitSnapshot: 2,
      now,
    });
    expect(consumed.canStart).toBe(false);
    expect(consumed.used).toBe(2);
    expect(consumed.usedToday).toBe(2);
    expect(consumed.remaining).toBe(0);
    expect(consumed.nextAvailableAt).toBe('2026-07-24T17:00:00.000Z');

    const free = buildDailyUsageResponse({
      usedCount: 1,
      reservedCount: 0,
      limitSnapshot: 2,
      now,
    });
    expect(free.canStart).toBe(true);
    expect(free.remainingToday).toBe(1);
    expect(free.nextAvailableAt).toBeNull();
    expect(free.unlimited).toBe(false);
  });

  it('keeps canStart true for unlimited admin quota after the daily limit', () => {
    const now = new Date('2026-07-24T05:00:00.000Z');
    const admin = buildDailyUsageResponse({
      usedCount: 8,
      reservedCount: 0,
      limitSnapshot: 2,
      now,
      unlimited: true,
    });
    expect(admin.canStart).toBe(true);
    expect(admin.status).toBe('AVAILABLE');
    expect(admin.unlimited).toBe(true);
    expect(admin.nextAvailableAt).toBeNull();
    expect(admin.remainingToday).toBe(2);
  });
});
