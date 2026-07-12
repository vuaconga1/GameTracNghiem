import { describe, expect, it } from 'vitest';
import { calculatePoints, SCORING } from './scoring';

describe('calculatePoints', () => {
  it('gives CORRECT_MAX when correct and elapsedMs is 0', () => {
    expect(calculatePoints(true, 0)).toBe(SCORING.CORRECT_MAX);
  });

  it('gives CORRECT_MIN when correct and elapsedMs >= TIME_LIMIT_MS', () => {
    expect(calculatePoints(true, SCORING.TIME_LIMIT_MS)).toBe(SCORING.CORRECT_MIN);
  });

  it('gives negative WRONG_MAX magnitude when wrong and very slow', () => {
    expect(calculatePoints(false, SCORING.TIME_LIMIT_MS)).toBe(-SCORING.WRONG_MAX);
  });

  it('gives negative WRONG_MIN magnitude when wrong and elapsedMs is 0', () => {
    expect(calculatePoints(false, 0)).toBe(-SCORING.WRONG_MIN);
  });
});
