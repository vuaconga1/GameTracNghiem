import { describe, expect, it } from 'vitest';

import { gradeGrammarAnswer } from './gradeAnswer';

describe('gradeGrammarAnswer', () => {
  it('accepts an answer that matches after trimming and lowercasing', () => {
    expect(gradeGrammarAnswer('  GOES  ', ['goes'])).toBe(true);
  });

  it('collapses multiple spaces in input before comparing', () => {
    expect(gradeGrammarAnswer('has   been', ['has been'])).toBe(true);
  });

  it('rejects an answer that does not match any accepted answer', () => {
    expect(gradeGrammarAnswer('go', ['goes', 'went'])).toBe(false);
  });

  it('ignores trailing punctuation on the expected answer', () => {
    expect(gradeGrammarAnswer('visiting museums', ['visiting museums.'])).toBe(true);
  });

  it('treats curly and straight apostrophes as the same', () => {
    expect(gradeGrammarAnswer("I'm waiting", ["I’m waiting"])).toBe(true);
  });
});
