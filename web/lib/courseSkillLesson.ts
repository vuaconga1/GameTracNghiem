import { parseCourseGameLessonRange, type CourseGameLessonRange } from './courseGameLesson';
import { isSkillId, type SkillId } from './skillCatalog';

export type CourseSkillLessonRange = CourseGameLessonRange;

export type CourseSkillLessonDescriptor = {
  ebookId: string;
  skillId: SkillId;
  pageStart: number;
  pageEnd: number;
};

export function isCourseSkillId(value: unknown): value is SkillId {
  return isSkillId(value);
}

export function parseCourseSkillLessonRange(
  value: { pageStart?: unknown; pageEnd?: unknown },
  pageCount: number | null | undefined
) {
  return parseCourseGameLessonRange(value, pageCount);
}

/** Validate a stored skill mapping against an active ebook's page count. */
export function resolveCourseSkillLessonDescriptor(input: {
  ebookId: string;
  skillId: SkillId;
  pageStart: number;
  pageEnd: number;
  pageCount: number | null | undefined;
}): CourseSkillLessonDescriptor | null {
  const parsed = parseCourseSkillLessonRange(
    { pageStart: input.pageStart, pageEnd: input.pageEnd },
    input.pageCount
  );
  if (!parsed.ok) return null;
  return {
    ebookId: input.ebookId,
    skillId: input.skillId,
    pageStart: parsed.value.pageStart,
    pageEnd: parsed.value.pageEnd,
  };
}

export type SkillLessonMap = Partial<Record<SkillId, CourseSkillLessonRange>>;

export type ResolvedCourseEbookPages =
  | { kind: 'unit'; pageStart: number; pageEnd: number }
  | { kind: 'skill'; skillId: SkillId; pageStart: number; pageEnd: number }
  | { kind: 'missing-ebook' }
  | { kind: 'missing-skill-lesson'; skillId: SkillId };

/**
 * Student Bài học pages:
 * - no `?skill=` → unit ebook range (full configured course range)
 * - with `?skill=` → that skill's CourseSkillLesson range, or empty if unset
 */
export function resolveCourseEbookPagesForSkill(input: {
  skillId: SkillId | null;
  unitEbook: { pageStart: number; pageEnd: number } | null;
  skillLessons: SkillLessonMap | null | undefined;
}): ResolvedCourseEbookPages {
  if (!input.unitEbook) return { kind: 'missing-ebook' };

  if (!input.skillId) {
    return {
      kind: 'unit',
      pageStart: input.unitEbook.pageStart,
      pageEnd: input.unitEbook.pageEnd,
    };
  }

  const lesson = input.skillLessons?.[input.skillId];
  if (!lesson) {
    return { kind: 'missing-skill-lesson', skillId: input.skillId };
  }

  return {
    kind: 'skill',
    skillId: input.skillId,
    pageStart: lesson.pageStart,
    pageEnd: lesson.pageEnd,
  };
}

export function skillLessonsToMap(
  rows: Array<{ skillId: string; pageStart: number; pageEnd: number }> | null | undefined
): SkillLessonMap {
  const map: SkillLessonMap = {};
  for (const row of rows || []) {
    if (!isSkillId(row.skillId)) continue;
    map[row.skillId] = { pageStart: row.pageStart, pageEnd: row.pageEnd };
  }
  return map;
}

/** English for Logistics / Logictics — used for lesson fallbacks and filters. */
export function isLogisticsLevelName(levelName: string | null | undefined): boolean {
  return /logi[sc]tics/i.test(String(levelName || ''));
}

const DIRECT_LESSON_SKILL_ORDER: SkillId[] = [
  'vocabulary',
  'reading',
  'listening',
  'speaking',
  'writing',
];

/**
 * Page range when opening a Logistics unit (no skill card step).
 * Prefer vocabulary skill lesson, then any configured skill lesson, else unit range.
 */
export function resolveDirectUnitLessonPages(input: {
  unitEbook: { pageStart: number; pageEnd: number } | null;
  skillLessons: SkillLessonMap | null | undefined;
}): ResolvedCourseEbookPages {
  if (!input.unitEbook) return { kind: 'missing-ebook' };

  const lessons = input.skillLessons || {};
  for (const skillId of DIRECT_LESSON_SKILL_ORDER) {
    const lesson = lessons[skillId];
    if (!lesson) continue;
    return {
      kind: 'skill',
      skillId,
      pageStart: lesson.pageStart,
      pageEnd: lesson.pageEnd,
    };
  }

  return {
    kind: 'unit',
    pageStart: input.unitEbook.pageStart,
    pageEnd: input.unitEbook.pageEnd,
  };
}
