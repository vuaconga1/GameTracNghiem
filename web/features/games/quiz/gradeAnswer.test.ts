import { describe, expect, it } from 'vitest';

import { gradeQuizFillAnswer, gradeQuizOptionAnswer } from './gradeAnswer';

describe('gradeQuizFillAnswer', () => {
  it('accepts an answer that matches after trimming and lowercasing', () => {
    expect(gradeQuizFillAnswer('  Goes  ', ['goes', 'go'])).toBe(true);
  });

  it('rejects an answer that does not match', () => {
    expect(gradeQuizFillAnswer('go', ['goes'])).toBe(false);
  });
});

describe('gradeQuizOptionAnswer', () => {
  it('matches selected option to canonical answer', () => {
    expect(gradeQuizOptionAnswer('goes', 'Goes')).toBe(true);
  });

  it('rejects a wrong option', () => {
    expect(gradeQuizOptionAnswer('go', 'goes')).toBe(false);
  });
});
