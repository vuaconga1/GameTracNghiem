import { describe, expect, it } from 'vitest';

import { gradeScrambleAnswer, normalizeScrambleAnswer } from './gradeAnswer';

describe('normalizeScrambleAnswer', () => {
  it('trims, lowercases, and strips all spaces', () => {
    expect(normalizeScrambleAnswer('  ICE  Cream  ')).toBe('icecream');
  });
});

describe('gradeScrambleAnswer', () => {
  it('accepts a correct answer after normalization', () => {
    expect(gradeScrambleAnswer('PENCIL', 'pencil')).toBe(true);
  });

  it('accepts multi-word answers when spaces are omitted in slots', () => {
    expect(gradeScrambleAnswer('icecream', 'ice cream')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(gradeScrambleAnswer('pencel', 'pencil')).toBe(false);
  });
});
