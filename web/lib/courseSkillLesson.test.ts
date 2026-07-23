import { describe, expect, it } from 'vitest';

import {
  resolveCourseEbookPagesForSkill,
  skillLessonsToMap,
} from './courseSkillLesson';

describe('resolveCourseEbookPagesForSkill', () => {
  const unitEbook = { pageStart: 1, pageEnd: 5 };

  it('returns missing-ebook when the unit has no PDF', () => {
    expect(
      resolveCourseEbookPagesForSkill({
        skillId: 'listening',
        unitEbook: null,
        skillLessons: { listening: { pageStart: 1, pageEnd: 1 } },
      })
    ).toEqual({ kind: 'missing-ebook' });
  });

  it('uses the unit range when no skill is selected', () => {
    expect(
      resolveCourseEbookPagesForSkill({
        skillId: null,
        unitEbook,
        skillLessons: { listening: { pageStart: 1, pageEnd: 1 } },
      })
    ).toEqual({ kind: 'unit', pageStart: 1, pageEnd: 5 });
  });

  it('uses the skill range when configured', () => {
    expect(
      resolveCourseEbookPagesForSkill({
        skillId: 'listening',
        unitEbook,
        skillLessons: { listening: { pageStart: 2, pageEnd: 2 } },
      })
    ).toEqual({
      kind: 'skill',
      skillId: 'listening',
      pageStart: 2,
      pageEnd: 2,
    });
  });

  it('does not fall back to the full PDF when a skill has no mapping', () => {
    expect(
      resolveCourseEbookPagesForSkill({
        skillId: 'reading',
        unitEbook,
        skillLessons: { listening: { pageStart: 1, pageEnd: 1 } },
      })
    ).toEqual({ kind: 'missing-skill-lesson', skillId: 'reading' });
  });
});

describe('skillLessonsToMap', () => {
  it('keeps only known skill ids', () => {
    expect(
      skillLessonsToMap([
        { skillId: 'listening', pageStart: 1, pageEnd: 1 },
        { skillId: 'nope', pageStart: 2, pageEnd: 2 },
      ])
    ).toEqual({ listening: { pageStart: 1, pageEnd: 1 } });
  });
});
