import { describe, expect, it } from 'vitest';

import { isPublicPlayerPage, isPublicStaticAsset } from './middleware';

describe('Public static assets', () => {
  it('allows course thumbnails and logos for guests', () => {
    expect(isPublicStaticAsset('/wewinlogo.png')).toBe(true);
    expect(isPublicStaticAsset('/images/courses/lop8/unit-01.svg')).toBe(true);
    expect(isPublicStaticAsset('/images/games/lop1-vocab/unit-01/ball.png')).toBe(true);
  });

  it('does not treat app routes as static assets', () => {
    expect(isPublicStaticAsset('/courses/abc')).toBe(false);
    expect(isPublicStaticAsset('/admin')).toBe(false);
  });
});

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

describe('Logistics public route', () => {
  it('allows guests to open logistics week routes', () => {
    expect(isPublicPlayerPage('/logistics')).toBe(true);
    expect(isPublicPlayerPage('/logistics/week2')).toBe(true);
  });
});
