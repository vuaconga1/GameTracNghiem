import { describe, expect, it } from 'vitest';

import { progressCourseKey } from './courseKey';

describe('progressCourseKey', () => {
  it('uses trimmed course name when level is empty', () => {
    expect(progressCourseKey(' EveryUp ', '')).toBe('EveryUp');
    expect(progressCourseKey(' EveryUp ', null)).toBe('EveryUp');
  });

  it('uses trimmed course and level joined by a pipe when level is present', () => {
    expect(progressCourseKey(' EveryUp ', ' Cấp Lớp 8 ')).toBe('EveryUp|Cấp Lớp 8');
  });
});
