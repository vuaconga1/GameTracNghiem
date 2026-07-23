import type { PrismaClient } from '@prisma/client';

export const LOP8_LEVEL = 'Lớp 8';

/** Global Success 8 — first semester units 1–6 (HK1). */
export const LOP8_UNIT_TITLES: Record<number, string> = {
  1: 'Leisure Time',
  2: 'Life In The Countryside',
  3: 'Teenagers',
  4: 'Ethnic Groups Of Viet Nam',
  5: 'Our Customs And Traditions',
  6: 'Lifestyles',
};

export const LOP8_UNIT_COUNT = 6;

export function lop8UnitCourseName(unit: number): string {
  const title = LOP8_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 8 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
}

/** Parse unit number from "Unit N", "UNIT N: …", etc. */
export function parseLop8UnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

type CourseRow = { id: string; name: string };

export async function findLop8CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP8_LEVEL, archivedAt: null },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop8UnitNumber(course.name) === unit) ?? null
  );
}
