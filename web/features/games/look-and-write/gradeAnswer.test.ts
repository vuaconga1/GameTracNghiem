import { describe, expect, it } from 'vitest';

import {
  gradeLookAndWriteExercise,
  gradeLookAndWriteItem,
  normalizeWord,
} from './gradeAnswer';

describe('normalizeWord', () => {
  it('trims, lowercases, and collapses spaces', () => {
    expect(normalizeWord('  Hello   World  ')).toBe('hello world');
  });
});

describe('gradeLookAndWriteItem', () => {
  it('accepts a matching word after normalization', () => {
    expect(gradeLookAndWriteItem('  Apple ', 'apple')).toBe(true);
  });

  it('rejects a non-matching word', () => {
    expect(gradeLookAndWriteItem('banana', 'apple')).toBe(false);
  });
});

describe('gradeLookAndWriteExercise', () => {
  it('marks exercise correct only when every item matches', () => {
    const result = gradeLookAndWriteExercise(
      { 0: 'cat', 1: 'dog' },
      [{ answer: 'cat' }, { answer: 'dog' }]
    );
    expect(result.isCorrect).toBe(true);
    expect(result.itemResults).toEqual([true, true]);
  });

  it('marks exercise wrong when any item does not match', () => {
    const result = gradeLookAndWriteExercise(
      { 0: 'cat', 1: 'fish' },
      [{ answer: 'cat' }, { answer: 'dog' }]
    );
    expect(result.isCorrect).toBe(false);
    expect(result.itemResults).toEqual([true, false]);
  });
});
