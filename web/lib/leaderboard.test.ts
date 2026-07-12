import { describe, expect, it } from 'vitest';

import {
  getAnchorParts,
  getPeriodBounds,
  getPeriodKey,
  getPeriodLabel,
  hoChiMinhLocalToUtc,
} from './leaderboardPeriod';

describe('leaderboard period windows', () => {
  const noonHcm = new Date('2026-07-12T05:00:00.000Z');

  it('maps a Ho Chi Minh calendar day to UTC bounds', () => {
    const bounds = getPeriodBounds('day', 0, noonHcm)!;

    expect(bounds.start.toISOString()).toBe('2026-07-11T17:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-07-12T17:00:00.000Z');
    expect(getPeriodKey('day', hoChiMinhLocalToUtc(2026, 7, 12, 12))).toBe('2026-07-12');
    expect(getPeriodKey('day', bounds.start)).toBe('2026-07-12');
    expect(getPeriodKey('day', new Date(bounds.end.getTime() - 1))).toBe('2026-07-12');
  });

  it('uses ISO week windows starting on Monday in Ho Chi Minh', () => {
    const bounds = getPeriodBounds('week', 0, noonHcm)!;

    expect(bounds.start.toISOString()).toBe('2026-07-05T17:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-07-12T17:00:00.000Z');
    expect(getPeriodLabel('week', 0, noonHcm)).toMatch(/^TUẦN \d+$/);
    expect(getAnchorParts('week', 0, noonHcm)).toEqual({ year: 2026, month: 7, day: 12 });
  });

  it('covers the full Ho Chi Minh month', () => {
    const bounds = getPeriodBounds('month', 0, noonHcm)!;

    expect(bounds.start.toISOString()).toBe('2026-06-30T17:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-07-31T17:00:00.000Z');
    expect(getPeriodLabel('month', 0, noonHcm)).toBe('THÁNG 7/2026');
    expect(getPeriodKey('month', bounds.start)).toBe('2026-07');
  });

  it('returns null bounds for all-time leaderboard', () => {
    expect(getPeriodBounds('all', 0, noonHcm)).toBeNull();
    expect(getPeriodLabel('all', 0, noonHcm)).toBe('TẤT CẢ');
  });
});
