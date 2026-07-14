import { describe, expect, it } from 'vitest';

import { progressCourseKey, scoreLookupCourseKeys } from './courseKey';

describe('progressCourseKey', () => {
  it('uses trimmed course name when level is empty', () => {
    expect(progressCourseKey(' EveryUp ', '')).toBe('EveryUp');
    expect(progressCourseKey(' EveryUp ', null)).toBe('EveryUp');
  });

  it('uses trimmed course and level joined by a pipe when level is present', () => {
    expect(progressCourseKey(' EveryUp ', ' Cấp Lớp 8 ')).toBe('EveryUp|Cấp Lớp 8');
  });
});

describe('scoreLookupCourseKeys', () => {
  it('returns both progress key and legacy name-only key', () => {
    expect(scoreLookupCourseKeys('Unit 1', 'Lớp 8')).toEqual(['Unit 1|Lớp 8', 'Unit 1']);
  });

  it('returns only the name when level is empty', () => {
    expect(scoreLookupCourseKeys('EveryUp', '')).toEqual(['EveryUp']);
  });
});
