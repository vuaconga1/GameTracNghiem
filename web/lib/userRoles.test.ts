import { describe, expect, it } from 'vitest';

import {
  canAccessCourseLevel,
  filterLevelsForRole,
  homeHrefForRole,
  normalizeUserRole,
  parseUserRoleInput,
} from './userRoles';

describe('userRoles', () => {
  it('normalizes legacy student to WewinStudent', () => {
    expect(normalizeUserRole('student')).toBe('WewinStudent');
    expect(normalizeUserRole(undefined)).toBe('WewinStudent');
  });

  it('parses admin input values', () => {
    expect(parseUserRoleInput('admin')).toBe('admin');
    expect(parseUserRoleInput('LogisticsStudent')).toBe('LogisticsStudent');
    expect(parseUserRoleInput('student')).toBe('WewinStudent');
    expect(parseUserRoleInput('bogus')).toBeNull();
  });

  it('maps home href by role', () => {
    expect(homeHrefForRole('admin')).toBe('/');
    expect(homeHrefForRole('WewinStudent')).toBe('/');
    expect(homeHrefForRole('LogisticsStudent')).toBe('/logistics');
  });

  it('restricts course levels by role', () => {
    expect(canAccessCourseLevel('admin', 'Lớp 3')).toBe(true);
    expect(canAccessCourseLevel('admin', 'English For Logictics')).toBe(true);
    expect(canAccessCourseLevel('WewinStudent', 'Lớp 3')).toBe(true);
    expect(canAccessCourseLevel('WewinStudent', 'English For Logictics')).toBe(false);
    expect(canAccessCourseLevel('LogisticsStudent', 'Lớp 3')).toBe(false);
    expect(canAccessCourseLevel('LogisticsStudent', 'English For Logictics')).toBe(true);
  });

  it('filters available levels by role', () => {
    const levels = ['Lớp 1', 'Lớp 9', 'English For Logictics'];
    expect(filterLevelsForRole('admin', levels)).toEqual(levels);
    expect(filterLevelsForRole('WewinStudent', levels)).toEqual(['Lớp 1', 'Lớp 9']);
    expect(filterLevelsForRole('LogisticsStudent', levels)).toEqual(['English For Logictics']);
  });
});
