import { describe, expect, it } from 'vitest';

import {
  getWordSyllables,
  stressedSyllableText,
  unstressedSyllableText,
} from './syllables';

describe('syllables', () => {
  it('returns known stress pattern for computer', () => {
    expect(getWordSyllables('computer')).toEqual([
      { text: 'com', stressed: false },
      { text: 'pu', stressed: true },
      { text: 'ter', stressed: false },
    ]);
  });

  it('splits hyphenated words and marks stress', () => {
    expect(getWordSyllables("ba-na'na")).toEqual([
      { text: 'ba', stressed: true },
      { text: 'nana', stressed: true },
    ]);
  });

  it('builds feedback labels from stressed syllables', () => {
    expect(stressedSyllableText('computer')).toBe('PU');
    expect(unstressedSyllableText('computer')).toBe('com');
  });
});
