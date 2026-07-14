import { describe, expect, it } from 'vitest';

import { gradeWordMatchPair } from './gradeAnswer';

describe('gradeWordMatchPair', () => {
  it('returns true when word and image share the same question index', () => {
    expect(gradeWordMatchPair(0, 0)).toBe(true);
    expect(gradeWordMatchPair(3, 3)).toBe(true);
  });

  it('returns false when word and image indices differ', () => {
    expect(gradeWordMatchPair(0, 1)).toBe(false);
    expect(gradeWordMatchPair(2, 0)).toBe(false);
  });
});
