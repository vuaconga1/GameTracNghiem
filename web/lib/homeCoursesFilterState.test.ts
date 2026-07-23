import { describe, expect, it } from 'vitest';

import {
  buildHomeCoursesHref,
  normalizeHomeCoursesLevelName,
  readHomeCoursesLevelFromSearch,
  readHomeCoursesLevelParam,
  resolveClientHomeCoursesLevel,
} from './homeCoursesFilterState';

describe('homeCoursesFilterState', () => {
  it('normalizes blank level names to empty strings', () => {
    expect(normalizeHomeCoursesLevelName('  Lop 8  ')).toBe('Lop 8');
    expect(normalizeHomeCoursesLevelName('   ')).toBe('');
    expect(normalizeHomeCoursesLevelName(null)).toBe('');
  });

  it('reads the first levelName query param value', () => {
    expect(readHomeCoursesLevelParam(['Lop 6', 'Lop 7'])).toBe('Lop 6');
    expect(readHomeCoursesLevelParam('  Lop 8 ')).toBe('Lop 8');
    expect(readHomeCoursesLevelParam(undefined)).toBe('');
  });

  it('writes the selected level into the courses page URL', () => {
    expect(buildHomeCoursesHref('/courses', '', 'Lop 8')).toBe('/courses?levelName=Lop+8');
    expect(buildHomeCoursesHref('/courses', 'foo=bar', 'Lop 9')).toBe(
      '/courses?foo=bar&levelName=Lop+9'
    );
  });

  it('removes levelName from the URL when no level is selected', () => {
    expect(buildHomeCoursesHref('/courses', 'foo=bar&levelName=Lop+8', '')).toBe('/courses?foo=bar');
    expect(buildHomeCoursesHref('/courses', 'levelName=Lop+8', '   ')).toBe('/courses');
  });

  it('reads levelName from the browser search string', () => {
    expect(readHomeCoursesLevelFromSearch('levelName=Lop+8&foo=bar')).toBe('Lop 8');
    expect(readHomeCoursesLevelFromSearch('')).toBe('');
  });

  it('prefers URL, then localStorage, then server default', () => {
    expect(
      resolveClientHomeCoursesLevel({
        urlLevelName: 'Lop 9',
        storedLevelName: 'Lop 8',
        serverLevelName: 'Lop 6',
      })
    ).toBe('Lop 9');

    expect(
      resolveClientHomeCoursesLevel({
        urlLevelName: '',
        storedLevelName: 'Lop 8',
        serverLevelName: 'Lop 6',
      })
    ).toBe('Lop 8');

    expect(
      resolveClientHomeCoursesLevel({
        urlLevelName: '',
        storedLevelName: '',
        serverLevelName: 'Lop 6',
      })
    ).toBe('Lop 6');
  });
});
