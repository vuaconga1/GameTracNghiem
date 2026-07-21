import { describe, expect, it } from 'vitest';

import { resolveCourseGameLessonDescriptor } from './courseGameLesson';

describe('resolveCourseGameLessonDescriptor', () => {
  it('returns a descriptor for a valid inclusive range within pageCount', () => {
    expect(
      resolveCourseGameLessonDescriptor({
        ebookId: 'ebook-1',
        pageStart: 2,
        pageEnd: 5,
        pageCount: 10,
      }),
    ).toEqual({
      ebookId: 'ebook-1',
      pageStart: 2,
      pageEnd: 5,
    });
  });

  it('returns null for non-positive page numbers', () => {
    expect(
      resolveCourseGameLessonDescriptor({
        ebookId: 'ebook-1',
        pageStart: 0,
        pageEnd: 3,
        pageCount: 10,
      }),
    ).toBeNull();
  });

  it('returns null for reversed ranges', () => {
    expect(
      resolveCourseGameLessonDescriptor({
        ebookId: 'ebook-1',
        pageStart: 8,
        pageEnd: 3,
        pageCount: 10,
      }),
    ).toBeNull();
  });

  it('returns null when the range overflows the ebook pageCount', () => {
    expect(
      resolveCourseGameLessonDescriptor({
        ebookId: 'ebook-1',
        pageStart: 2,
        pageEnd: 12,
        pageCount: 10,
      }),
    ).toBeNull();
  });
});
