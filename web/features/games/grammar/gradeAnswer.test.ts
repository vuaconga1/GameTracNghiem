import { describe, expect, it } from 'vitest';

import { gradeGrammarAnswer } from './gradeAnswer';

describe('gradeGrammarAnswer', () => {
  it('accepts an answer that matches after trimming and lowercasing', () => {
    expect(gradeGrammarAnswer('  GOES  ', ['goes'])).toBe(true);
  });

  it('rejects an answer that does not match any accepted answer', () => {
    expect(gradeGrammarAnswer('go', ['goes', 'went'])).toBe(false);
  });
});
