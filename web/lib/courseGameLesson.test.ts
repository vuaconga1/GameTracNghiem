import { describe, expect, it } from 'vitest';

import { isCourseGameKey, parseCourseGameLessonRange } from './courseGameLesson';

describe('isCourseGameKey', () => {
  it('accepts a canonical game key', () => {
    expect(isCourseGameKey('grammar')).toBe(true);
  });

  it('rejects an unknown game key', () => {
    expect(isCourseGameKey('unknown-game')).toBe(false);
  });
});

describe('parseCourseGameLessonRange', () => {
  it.each([
    [{ pageStart: '0', pageEnd: '2' }],
    [{ pageStart: '-1', pageEnd: '2' }],
    [{ pageStart: '1.5', pageEnd: '2' }],
    [{ pageStart: 'abc', pageEnd: '2' }],
  ])('rejects page values that are not positive integers', (value) => {
    expect(parseCourseGameLessonRange(value, null)).toEqual({
      ok: false,
      message: 'Trang bắt đầu và trang kết thúc phải là số nguyên dương.',
    });
  });

  it('rejects a reversed range', () => {
    expect(parseCourseGameLessonRange({ pageStart: '5', pageEnd: '3' }, null)).toEqual({
      ok: false,
      message: 'Trang kết thúc phải lớn hơn hoặc bằng trang bắt đầu.',
    });
  });

  it('rejects a range beyond a known PDF page count', () => {
    expect(parseCourseGameLessonRange({ pageStart: '2', pageEnd: '11' }, 10)).toEqual({
      ok: false,
      message: 'Phạm vi trang không được vượt quá 10 trang của tệp PDF.',
    });
  });

  it('parses a valid inclusive range', () => {
    expect(parseCourseGameLessonRange({ pageStart: '2', pageEnd: '5' }, 10)).toEqual({
      ok: true,
      value: { pageStart: 2, pageEnd: 5 },
    });
  });
});
