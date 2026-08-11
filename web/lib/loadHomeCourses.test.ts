import { describe, expect, it } from 'vitest';

import {
  gradeLevelsOnly,
  resolveHomeCoursesLevel,
  resolveSelectedHomeLevel,
} from './homeCourseLevel';

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

describe('gradeLevelsOnly', () => {
  it('removes logistics levels from the home sidebar list', () => {
    expect(
      gradeLevelsOnly(['English For Logictics', 'Lớp 1', 'Lớp 9', 'English for Logistics']),
    ).toEqual(['Lớp 1', 'Lớp 9']);
  });
});

describe('resolveSelectedHomeLevel', () => {
  it('defaults to the first grade level and ignores logistics', () => {
    expect(
      resolveSelectedHomeLevel('', ['English For Logictics', 'Lớp 1', 'Lớp 2']),
    ).toBe('Lớp 1');
  });

  it('resolves logistics requests to the logistics level name in the catalog', () => {
    expect(
      resolveSelectedHomeLevel('English For Logistics', [
        'English For Logictics',
        'Lớp 1',
      ]),
    ).toBe('English For Logictics');
  });
});
