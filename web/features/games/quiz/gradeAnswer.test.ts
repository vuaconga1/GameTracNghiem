import { describe, expect, it } from 'vitest';

import { gradeQuizFillAnswer, gradeQuizOptionAnswer } from './gradeAnswer';

describe('gradeQuizFillAnswer', () => {
  it('accepts an answer that matches after trimming and lowercasing', () => {
    expect(gradeQuizFillAnswer('  Goes  ', ['goes', 'go'])).toBe(true);
  });

  it('rejects an answer that does not match', () => {
    expect(gradeQuizFillAnswer('go', ['goes'])).toBe(false);
  });

  it('ignores trailing punctuation on the expected fill answer', () => {
    expect(gradeQuizFillAnswer('visiting museums', ['visiting museums.'])).toBe(true);
  });

  it('treats curly and straight apostrophes as the same', () => {
    expect(gradeQuizFillAnswer("I'm waiting", ["I’m waiting"])).toBe(true);
  });
});

describe('gradeQuizOptionAnswer', () => {
  it('matches selected option to canonical answer', () => {
    expect(gradeQuizOptionAnswer('goes', 'Goes')).toBe(true);
  });

  it('rejects a wrong option', () => {
    expect(gradeQuizOptionAnswer('go', 'goes')).toBe(false);
  });

  it('ignores underline markup when comparing phonetics options', () => {
    expect(gradeQuizOptionAnswer('b<u>ea</u>r', 'b<u>ea</u>r')).toBe(true);
    expect(gradeQuizOptionAnswer('b<u>ea</u>r', 'bear')).toBe(true);
    expect(gradeQuizOptionAnswer('cl<u>ea</u>r', 'b<u>ea</u>r')).toBe(false);
  });

  it('does not ignore trailing punctuation on option text', () => {
    expect(gradeQuizOptionAnswer('goes.', 'goes')).toBe(false);
  });
});