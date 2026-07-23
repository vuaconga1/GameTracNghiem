import { describe, expect, it } from 'vitest';

import { compareCourseNames, sortCoursesByLevelAndName } from './sortCourses';

describe('compareCourseNames', () => {
  it('orders Unit names numerically', () => {
    const names = ['Unit 10', 'Unit 2', 'Unit 1', 'Unit 19', 'Unit 3'];
    expect([...names].sort(compareCourseNames)).toEqual([
      'Unit 1',
      'Unit 2',
      'Unit 3',
      'Unit 10',
      'Unit 19',
    ]);
  });
});

describe('sortCoursesByLevelAndName', () => {
  it('sorts by level then numeric unit name', () => {
    const sorted = sortCoursesByLevelAndName([
      { id: 'a', name: 'Unit 10', levelName: 'Lớp 4' },
      { id: 'b', name: 'Unit 2', levelName: 'Lớp 4' },
      { id: 'c', name: 'Unit 1', levelName: 'Lớp 3' },
    ]);
    expect(sorted.map((c) => `${c.levelName}:${c.name}`)).toEqual([
      'Lớp 3:Unit 1',
      'Lớp 4:Unit 2',
      'Lớp 4:Unit 10',
    ]);
  });
});
