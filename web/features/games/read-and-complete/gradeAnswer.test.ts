import { describe, expect, it } from 'vitest';

import {
  gradeReadAndCompleteExercise,
  gradeReadAndCompleteItem,
  normalizeWord,
} from './gradeAnswer';

describe('normalizeWord', () => {
  it('trims, lowercases, and collapses spaces', () => {
    expect(normalizeWord('  Hello   World  ')).toBe('hello world');
  });
});

describe('gradeReadAndCompleteItem', () => {
  it('accepts a matching word after normalization', () => {
    expect(gradeReadAndCompleteItem('  Apple ', 'apple')).toBe(true);
  });

  it('rejects a non-matching word', () => {
    expect(gradeReadAndCompleteItem('banana', 'apple')).toBe(false);
  });
});

describe('gradeReadAndCompleteExercise', () => {
  it('marks exercise correct only when every blank matches', () => {
    const result = gradeReadAndCompleteExercise(
      { 0: 'is', 1: 'are' },
      [{ answer: 'is' }, { answer: 'are' }]
    );
    expect(result.isCorrect).toBe(true);
    expect(result.itemResults).toEqual([true, true]);
  });

  it('marks exercise wrong when any blank does not match', () => {
    const result = gradeReadAndCompleteExercise(
      { 0: 'is', 1: 'am' },
      [{ answer: 'is' }, { answer: 'are' }]
    );
    expect(result.isCorrect).toBe(false);
    expect(result.itemResults).toEqual([true, false]);
  });
});
