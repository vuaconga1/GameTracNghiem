import { describe, expect, it } from 'vitest';

import {
  LOP9_UNIT_COUNT,
  LOP9_UNIT_PAGE_RANGES,
  lop9UnitCourseName,
  lop9UnitPageRange,
  parseLop9UnitNumber,
} from './lop9Units';

describe('lop9Units', () => {
  it('parses unit numbers from course names', () => {
    expect(parseLop9UnitNumber('Unit 1: Local Environment')).toBe(1);
    expect(parseLop9UnitNumber('UNIT 6. Vietnamese Lifestyles')).toBe(6);
    expect(parseLop9UnitNumber('Lớp 9 Unit 1')).toBeNull();
  });

  it('exposes continuous unit page ranges for units 1-6', () => {
    const ranges = Array.from({ length: LOP9_UNIT_COUNT }, (_, index) =>
      lop9UnitPageRange(index + 1)
    );

    expect(ranges).toEqual([
      { pageStart: 1, pageEnd: 7 },
      { pageStart: 8, pageEnd: 14 },
      { pageStart: 15, pageEnd: 18 },
      { pageStart: 19, pageEnd: 24 },
      { pageStart: 25, pageEnd: 29 },
      { pageStart: 30, pageEnd: 35 },
    ]);

    expect(LOP9_UNIT_PAGE_RANGES[6]).toEqual({ pageStart: 30, pageEnd: 35 });
  });

  it('builds canonical course names', () => {
    expect(lop9UnitCourseName(1)).toBe('Unit 1: Local Environment');
    expect(lop9UnitCourseName(6)).toBe('Unit 6: Vietnamese Lifestyles: Then And Now');
  });
});
