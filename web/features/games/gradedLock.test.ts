import { describe, expect, it } from 'vitest';

import { gradedIsCorrect, isGradedStatus } from './gradedLock';

describe('gradedLock', () => {
  it('locks correct and wrong, not empty', () => {
    expect(isGradedStatus('correct')).toBe(true);
    expect(isGradedStatus('wrong')).toBe(true);
    expect(isGradedStatus('empty')).toBe(false);
    expect(isGradedStatus(undefined)).toBe(false);
  });

  it('maps status to correctness', () => {
    expect(gradedIsCorrect('correct')).toBe(true);
    expect(gradedIsCorrect('wrong')).toBe(false);
  });
});
