import { describe, expect, it } from 'vitest';

import {
  bestSessionScoreFromGroups,
  normalizePlaySessionKey,
  parseProgressCourseKey,
} from './playSession';

describe('normalizePlaySessionKey', () => {
  it('maps empty/null to legacy bucket', () => {
    expect(normalizePlaySessionKey(null)).toBe('__legacy__');
    expect(normalizePlaySessionKey('')).toBe('__legacy__');
    expect(normalizePlaySessionKey('  ')).toBe('__legacy__');
    expect(normalizePlaySessionKey('abc')).toBe('abc');
  });
});

describe('parseProgressCourseKey', () => {
  it('splits name and level', () => {
    expect(parseProgressCourseKey('Unit 1|Lớp 8')).toEqual({
      courseName: 'Unit 1',
      levelName: 'Lớp 8',
    });
    expect(parseProgressCourseKey('EveryUp')).toEqual({
      courseName: 'EveryUp',
      levelName: null,
    });
  });
});

describe('bestSessionScoreFromGroups', () => {
  it('returns 0 for empty groups', () => {
    expect(bestSessionScoreFromGroups([])).toBe(0);
  });

  it('picks the highest session sum, not lifetime total', () => {
    expect(
      bestSessionScoreFromGroups([
        { playSessionId: 's1', points: 400 },
        { playSessionId: 's2', points: 900 },
        { playSessionId: 's1', points: 50 },
      ])
    ).toBe(900);
  });

  it('treats null session ids as one legacy session', () => {
    expect(
      bestSessionScoreFromGroups([
        { playSessionId: null, points: 300 },
        { playSessionId: null, points: 200 },
        { playSessionId: 's-new', points: 450 },
      ])
    ).toBe(500);
  });
});
