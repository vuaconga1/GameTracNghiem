import { describe, expect, it } from 'vitest';

import { gradeReadAndMatchExercise, gradeReadAndMatchPair } from './gradeAnswer';

describe('gradeReadAndMatchPair', () => {
  it('matches label to answer with trim', () => {
    expect(gradeReadAndMatchPair(' A ', 'A')).toBe(true);
  });

  it('rejects non-matching label', () => {
    expect(gradeReadAndMatchPair('B', 'A')).toBe(false);
  });
});

describe('gradeReadAndMatchExercise', () => {
  it('marks exercise correct when every pair is correct', () => {
    const result = gradeReadAndMatchExercise(
      {
        0: { correct: true },
        1: { correct: true },
      },
      [{ answer: 'A' }, { answer: 'B' }]
    );
    expect(result.isCorrect).toBe(true);
    expect(result.itemResults).toEqual([true, true]);
  });

  it('marks exercise wrong when any pair is incorrect', () => {
    const result = gradeReadAndMatchExercise(
      {
        0: { correct: true },
        1: { correct: false },
      },
      [{ answer: 'A' }, { answer: 'B' }]
    );
    expect(result.isCorrect).toBe(false);
    expect(result.itemResults).toEqual([true, false]);
  });
});
