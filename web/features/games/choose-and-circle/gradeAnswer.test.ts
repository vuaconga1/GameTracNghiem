import { describe, expect, it } from 'vitest';

import {
  gradeChooseAndCircleExercise,
  gradeChooseAndCircleItem,
  normalizeWord,
} from './gradeAnswer';

describe('normalizeWord', () => {
  it('trims, lowercases, and collapses spaces', () => {
    expect(normalizeWord('  Brother  ')).toBe('brother');
    expect(normalizeWord('  Hello   World  ')).toBe('hello world');
  });
});

describe('gradeChooseAndCircleItem', () => {
  it('accepts a matching pick after normalization', () => {
    expect(gradeChooseAndCircleItem('  Brother ', 'brother')).toBe(true);
  });

  it('rejects a non-matching pick', () => {
    expect(gradeChooseAndCircleItem('sister', 'brother')).toBe(false);
  });
});

describe('gradeChooseAndCircleExercise', () => {
  it('marks exercise correct only when every item matches', () => {
    const result = gradeChooseAndCircleExercise(
      { 0: 'brother', 1: 'sister' },
      [{ answer: 'brother' }, { answer: 'sister' }]
    );
    expect(result.isCorrect).toBe(true);
    expect(result.itemResults).toEqual([true, true]);
  });

  it('marks exercise wrong when any item does not match', () => {
    const result = gradeChooseAndCircleExercise(
      { 0: 'brother', 1: 'brother' },
      [{ answer: 'brother' }, { answer: 'sister' }]
    );
    expect(result.isCorrect).toBe(false);
    expect(result.itemResults).toEqual([true, false]);
  });
});
