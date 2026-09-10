import { describe, expect, it } from 'vitest';

import {
  formatIsoWeekRangeLabel,
  getAnchorParts,
  getIsoWeekBoundsFromKey,
  getIsoWeekKeyFromParts,
  getPeriodBounds,
  getPeriodKey,
  getPeriodLabel,
  hoChiMinhLocalToUtc,
  parseIsoWeekKey,
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

describe('ISO week keys for parent weekly scores', () => {
  it('maps buổi 24/04/2026 to 2026-W17 (Mon 20/04–Sun 26/04)', () => {
    expect(getIsoWeekKeyFromParts(2026, 4, 24)).toBe('2026-W17');
    expect(getIsoWeekKeyFromParts(2026, 4, 22)).toBe('2026-W17');
    expect(getIsoWeekKeyFromParts(2026, 4, 20)).toBe('2026-W17');
    expect(getIsoWeekKeyFromParts(2026, 4, 26)).toBe('2026-W17');
    expect(formatIsoWeekRangeLabel(2026, 17)).toBe('20/04 – 26/04/2026');

    const bounds = getIsoWeekBoundsFromKey(2026, 17)!;
    expect(bounds.start.toISOString()).toBe('2026-04-19T17:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-04-26T17:00:00.000Z');
  });

  it('uses ISO week-year across the Dec/Jan boundary', () => {
    expect(getIsoWeekKeyFromParts(2025, 12, 29)).toBe('2026-W01');
    expect(getIsoWeekKeyFromParts(2026, 1, 1)).toBe('2026-W01');
    const bounds = getIsoWeekBoundsFromKey(2026, 1)!;
    expect(bounds.start.toISOString()).toBe('2025-12-28T17:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-01-04T17:00:00.000Z');
  });

  it('rejects a week 53 that does not exist in that ISO year', () => {
    expect(getIsoWeekBoundsFromKey(2025, 53)).toBeNull();
    expect(parseIsoWeekKey('2026-W17')).toEqual({ weekYear: 2026, isoWeek: 17 });
    expect(parseIsoWeekKey('not-a-week')).toBeNull();
  });
});
