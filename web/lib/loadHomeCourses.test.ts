import { describe, expect, it } from 'vitest';

import { resolveHomeCoursesLevel } from './homeCourseLevel';

describe('resolveHomeCoursesLevel', () => {
  it('defaults to the first concrete level when no level is requested', () => {
    expect(resolveHomeCoursesLevel('', ['A1', 'A2'])).toBe('A1');
  });

  it('keeps the requested level when one is provided', () => {
    expect(resolveHomeCoursesLevel('A2', ['A1', 'A2'])).toBe('A2');
  });

  it('returns empty when there are no concrete levels', () => {
    expect(resolveHomeCoursesLevel('', [])).toBe('');
  });
});
