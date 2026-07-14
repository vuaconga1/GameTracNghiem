import { describe, expect, it } from 'vitest';

import { gradeVocabularyCheckExercise, gradeVocabularyCheckItem } from './gradeAnswer';

describe('gradeVocabularyCheckItem', () => {
  it('accepts when user agrees the sentence is correct', () => {
    expect(gradeVocabularyCheckItem(true, true)).toBe(true);
  });

  it('accepts when user agrees the sentence is wrong', () => {
    expect(gradeVocabularyCheckItem(false, false)).toBe(true);
  });

  it('rejects when user disagrees with the answer key', () => {
    expect(gradeVocabularyCheckItem(true, false)).toBe(false);
    expect(gradeVocabularyCheckItem(false, true)).toBe(false);
  });

  it('rejects when user has not picked', () => {
    expect(gradeVocabularyCheckItem(undefined, true)).toBe(false);
  });
});

describe('gradeVocabularyCheckExercise', () => {
  it('marks exercise correct only when every row matches', () => {
    const result = gradeVocabularyCheckExercise(
      { 0: true, 1: false },
      [{ is_correct: true }, { is_correct: false }]
    );
    expect(result.isCorrect).toBe(true);
    expect(result.itemResults).toEqual([true, true]);
  });

  it('marks exercise wrong when any row does not match', () => {
    const result = gradeVocabularyCheckExercise(
      { 0: true, 1: true },
      [{ is_correct: true }, { is_correct: false }]
    );
    expect(result.isCorrect).toBe(false);
    expect(result.itemResults).toEqual([true, false]);
  });
});
