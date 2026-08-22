import { describe, expect, it } from 'vitest';

import { compareLetters } from './compareLetters';

describe('compareLetters', () => {
  it('marks cup vs kup with first letter mismatch heard as k', () => {
    const diffs = compareLetters('cup', 'kup');
    expect(diffs).toEqual([
      { sound: 'c', heard: 'k', status: 'mismatch' },
      { sound: 'u', heard: null, status: 'match' },
      { sound: 'p', heard: null, status: 'match' },
    ]);
  });

  it('marks exact match all green', () => {
    const diffs = compareLetters('cup', 'cup');
    expect(diffs.every((d) => d.status === 'match')).toBe(true);
    expect(diffs.map((d) => d.sound).join('')).toBe('cup');
  });

  it('aligns sentence letters including spaces', () => {
    const diffs = compareLetters('Nice to meet you', 'Nice to see them');
    const mismatched = diffs.filter((d) => d.status === 'mismatch' || d.status === 'missing' || d.status === 'extra');
    expect(mismatched.length).toBeGreaterThan(0);
    expect(diffs.some((d) => d.status === 'match' && d.sound === 'n')).toBe(true);
  });

  it('handles empty transcript as all missing', () => {
    const diffs = compareLetters('cup', '');
    expect(diffs).toEqual([
      { sound: 'c', heard: null, status: 'missing' },
      { sound: 'u', heard: null, status: 'missing' },
      { sound: 'p', heard: null, status: 'missing' },
    ]);
  });
});
