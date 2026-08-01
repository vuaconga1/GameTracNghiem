import { describe, expect, it } from 'vitest';

import { isStatusesFullyGraded, isSubsetFullyGraded } from './completeSession';

describe('isSubsetFullyGraded', () => {
  it('returns false for an empty subset', () => {
    expect(isSubsetFullyGraded([], ['correct'])).toBe(false);
  });

  it('returns true when every subset index is graded', () => {
    expect(isSubsetFullyGraded([0, 2], ['correct', 'empty', 'wrong', 'empty'])).toBe(true);
  });

  it('returns false when any subset index is still empty', () => {
    expect(isSubsetFullyGraded([0, 1, 2], ['correct', 'empty', 'wrong'])).toBe(false);
  });
});

describe('isStatusesFullyGraded', () => {
  it('returns false for empty statuses', () => {
    expect(isStatusesFullyGraded([])).toBe(false);
  });

  it('returns true when every status is graded', () => {
    expect(isStatusesFullyGraded(['correct', 'wrong'])).toBe(true);
  });

  it('returns false when any status is empty', () => {
    expect(isStatusesFullyGraded(['correct', 'empty'])).toBe(false);
  });
});
