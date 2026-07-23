import { describe, expect, it } from 'vitest';

import { courseCompletionPercent } from './courseProgress';

describe('courseCompletionPercent', () => {
  it('counts answered questions across enabled games', () => {
    expect(
      courseCompletionPercent({
        enabledGames: ['grammar', 'quiz'],
        questionCounts: { grammar: 3, quiz: 2, pronunciation: 8 },
        progress: {
          grammar: ['correct', 'wrong', 'empty'],
          quiz: ['correct', 'empty'],
          pronunciation: Array(8).fill('correct'),
        },
      })
    ).toBe(60);
  });

  it('returns zero when the course has no answerable questions', () => {
    expect(
      courseCompletionPercent({
        enabledGames: ['grammar'],
        questionCounts: {},
        progress: {},
      })
    ).toBe(0);
  });

  it('caps stale progress rows at the current question count', () => {
    expect(
      courseCompletionPercent({
        enabledGames: ['grammar'],
        questionCounts: { grammar: 2 },
        progress: { grammar: ['correct', 'wrong', 'correct'] },
      })
    ).toBe(100);
  });
});
