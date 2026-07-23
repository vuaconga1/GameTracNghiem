import type { PrismaClient } from '@prisma/client';

export const LOP4_LEVEL = 'Lớp 4';

/** Verified from Global Success 4 PDF pages 1–19 (page N = unit N). */
export const LOP4_UNIT_TITLES: Record<number, string> = {
  1: 'My Friends',
  2: 'Time And Daily Routines',
  3: 'My Week',
  4: 'My Birthday Party',
  5: 'Things We Can Do',
  6: 'Our School Facilities',
  7: 'Our Timetables',
  8: 'My Favourite Subjects',
  9: 'Our Sports Day',
  10: 'Our Summer Holidays',
  11: 'My Home',
  12: 'Jobs',
  13: 'Appearance',
  14: 'Daily Activities',
  15: "My Family's Weekends",
  16: 'Weather',
  17: 'In The City',
  18: 'At The Shopping Centre',
  19: 'The Animal World',
};

export const LOP4_UNIT_COUNT = 19;

export function lop4UnitCourseName(unit: number): string {
  const title = LOP4_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 4 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
}

/** Parse unit number from "Unit N" or "Unit N: Title". */
export function parseLop4UnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

export function legacyLop4UnitCourseName(unit: number): string {
  return `Unit ${unit}`;
}

export function legacyLop4ProgressCourseKey(unit: number): string {
  return `${legacyLop4UnitCourseName(unit)}|${LOP4_LEVEL}`;
}

export function lop4ProgressCourseKey(unit: number): string {
  return `${lop4UnitCourseName(unit)}|${LOP4_LEVEL}`;
}

type CourseRow = { id: string; name: string };

export async function findLop4CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP4_LEVEL, archivedAt: null },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop4UnitNumber(course.name) === unit) ?? null
  );
}
