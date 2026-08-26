import { describe, expect, it } from 'vitest';

import { allLop6UnitImagePaths, lop6UnitImagePath } from './lop6UnitThumbnails';

describe('lop6UnitThumbnails', () => {
  it('maps units 1–6 to public webp thumbs', () => {
    expect(lop6UnitImagePath(1)).toBe('/images/courses/lop6/unit-01.webp');
    expect(allLop6UnitImagePaths()).toEqual([
      '/images/courses/lop6/unit-01.webp',
      '/images/courses/lop6/unit-02.webp',
      '/images/courses/lop6/unit-03.webp',
      '/images/courses/lop6/unit-04.webp',
      '/images/courses/lop6/unit-05.webp',
      '/images/courses/lop6/unit-06.webp',
    ]);
  });
});
