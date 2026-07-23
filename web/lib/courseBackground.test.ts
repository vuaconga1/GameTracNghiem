import { describe, expect, it } from 'vitest';

import {
  courseBackgroundSrc,
  normalizeExternalImageUrl,
  normalizeStaticImagePath,
} from './courseBackground';

describe('course background helpers', () => {
  it('accepts only absolute http and https image URLs', () => {
    expect(normalizeExternalImageUrl(' https://cdn.example.com/unit-1.webp ')).toBe(
      'https://cdn.example.com/unit-1.webp'
    );
    expect(normalizeExternalImageUrl('http://example.com/unit.png')).toBe(
      'http://example.com/unit.png'
    );
    expect(normalizeExternalImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeExternalImageUrl('/local.png')).toBeNull();
  });

  it('prefers an uploaded image route over an external URL', () => {
    expect(
      courseBackgroundSrc({
        id: 'course-1',
        backgroundImageKey: 'course-1.webp',
        backgroundImageUrl: 'https://example.com/old.png',
      })
    ).toBe('/api/course-backgrounds/course-1');
  });

  it('accepts root-relative static image paths', () => {
    expect(normalizeStaticImagePath('/images/courses/lop4/unit-01.svg')).toBe(
      '/images/courses/lop4/unit-01.svg'
    );
    expect(normalizeStaticImagePath('../secret.png')).toBeNull();
    expect(normalizeStaticImagePath('//evil.example/x.png')).toBeNull();
  });

  it('falls back to external URL, static path, then null', () => {
    expect(
      courseBackgroundSrc({
        id: 'course-1',
        backgroundImageKey: null,
        backgroundImageUrl: 'https://example.com/unit.png',
      })
    ).toBe('https://example.com/unit.png');
    expect(
      courseBackgroundSrc({
        id: 'course-1',
        backgroundImageKey: null,
        backgroundImageUrl: '/images/courses/lop4/unit-01.svg',
      })
    ).toBe('/images/courses/lop4/unit-01.svg');
    expect(
      courseBackgroundSrc({
        id: 'course-1',
        backgroundImageKey: null,
        backgroundImageUrl: null,
      })
    ).toBeNull();
  });
});
