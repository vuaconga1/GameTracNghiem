import { describe, expect, it } from 'vitest';

import { getTtsSpeedByGrade, parseGradeFromLevelName } from '@/lib/tts/getTtsSpeedByGrade';

describe('getTtsSpeedByGrade', () => {
  it('maps grades 1–3 to 0.75', () => {
    expect(getTtsSpeedByGrade(1)).toBe(0.75);
    expect(getTtsSpeedByGrade(2)).toBe(0.75);
    expect(getTtsSpeedByGrade(3)).toBe(0.75);
  });

  it('maps grades 4–6 to 0.85', () => {
    expect(getTtsSpeedByGrade(4)).toBe(0.85);
    expect(getTtsSpeedByGrade(5)).toBe(0.85);
    expect(getTtsSpeedByGrade(6)).toBe(0.85);
  });

  it('maps grades 7–9 to 0.90', () => {
    expect(getTtsSpeedByGrade(7)).toBe(0.9);
    expect(getTtsSpeedByGrade(8)).toBe(0.9);
    expect(getTtsSpeedByGrade(9)).toBe(0.9);
  });

  it('falls back to 1.0 outside 1–9', () => {
    expect(getTtsSpeedByGrade(0)).toBe(1.0);
    expect(getTtsSpeedByGrade(10)).toBe(1.0);
    expect(getTtsSpeedByGrade(Number.NaN)).toBe(1.0);
  });
});

describe('parseGradeFromLevelName', () => {
  it('parses Vietnamese level labels', () => {
    expect(parseGradeFromLevelName('Lớp 8')).toBe(8);
    expect(parseGradeFromLevelName('lop 3')).toBe(3);
  });

  it('returns null when missing', () => {
    expect(parseGradeFromLevelName('')).toBeNull();
    expect(parseGradeFromLevelName('Advanced')).toBeNull();
  });
});
