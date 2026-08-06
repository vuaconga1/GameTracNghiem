import { describe, expect, it } from 'vitest';

import { isPublicPlayerPage } from './middleware';

describe('Speaking public route boundary', () => {
  it('allows the hub for guests but keeps every child route protected', () => {
    expect(isPublicPlayerPage('/speaking/course-1')).toBe(true);
    expect(isPublicPlayerPage('/speaking/course-1/')).toBe(true);
    expect(
      isPublicPlayerPage('/speaking/course-1/word-pronunciation'),
    ).toBe(false);
    expect(isPublicPlayerPage('/speaking/course-1/sentence-reading')).toBe(
      false,
    );
    expect(isPublicPlayerPage('/speaking/course-1/guided-answer')).toBe(false);
    expect(isPublicPlayerPage('/speaking/course-1/conversation')).toBe(false);
  });
});
