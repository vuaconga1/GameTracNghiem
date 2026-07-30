import type { PrismaClient } from '@prisma/client';

export const LOP9_LEVEL = 'Lớp 9';

/** Global Success 9 — first semester units 1–6 (HK1). */
export const LOP9_UNIT_TITLES: Record<number, string> = {
  1: 'Local Environment',
  2: 'City Life',
  3: 'Healthy Living For Teens',
  4: 'Remembering The Past',
  5: 'Our Experiences',
  6: 'Vietnamese Lifestyles: Then And Now',
};

export const LOP9_UNIT_COUNT = 6;

export type Lop9UnitPageRange = {
  pageStart: number;
  pageEnd: number;
};

/**
 * `PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx` is a single combined lesson
 * source. Its embedded full-page images are grouped under each `UNIT N`
 * heading in document order, which yields these page blocks in the generated
 * combined PDF:
 * - Unit 1: images 1–7
 * - Unit 2: images 8–14
 * - Unit 3: images 15–18
 * - Unit 4: images 19–24
 * - Unit 5: images 25–29
 * - Unit 6: images 30–35
 */
export const LOP9_UNIT_PAGE_RANGES: Record<number, Lop9UnitPageRange> = {
  1: { pageStart: 1, pageEnd: 7 },
  2: { pageStart: 8, pageEnd: 14 },
  3: { pageStart: 15, pageEnd: 18 },
  4: { pageStart: 19, pageEnd: 24 },
  5: { pageStart: 25, pageEnd: 29 },
  6: { pageStart: 30, pageEnd: 35 },
};

export function lop9UnitCourseName(unit: number): string {
  const title = LOP9_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 9 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
}

export function lop9UnitPageRange(unit: number): Lop9UnitPageRange {
  const range = LOP9_UNIT_PAGE_RANGES[unit];
  if (!range) {
    throw new Error(`Unknown Lớp 9 unit number: ${unit}`);
  }
  return range;
}

/** Parse unit number from "Unit N", "UNIT N: …", etc. */
export function parseLop9UnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

type CourseRow = { id: string; name: string };

export async function findLop9CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP9_LEVEL, archivedAt: null },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop9UnitNumber(course.name) === unit) ?? null
  );
}

export async function findActiveLop9CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP9_LEVEL, archivedAt: null, active: true },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop9UnitNumber(course.name) === unit) ?? null
  );
}

/**
 * If a stale/archived Lop 9 unit id is requested, resolve it to the active
 * canonical unit row so local old links keep working after course cleanup.
 */
export async function resolveCanonicalLop9CourseId(
  prisma: PrismaClient,
  courseId: string,
): Promise<string> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      levelName: true,
      active: true,
      archivedAt: true,
    },
  });

  if (!course) return courseId;
  if (course.levelName !== LOP9_LEVEL) return courseId;
  if (course.active && course.archivedAt === null) return courseId;

  const unit = parseLop9UnitNumber(course.name);
  if (!unit) return courseId;

  const canonical = await findActiveLop9CourseByUnit(prisma, unit);
  return canonical?.id ?? courseId;
}

/** Create ClassLevel + Course for a unit if missing. */
export async function ensureLop9Course(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow> {
  const name = lop9UnitCourseName(unit);

  await prisma.classLevel.upsert({
    where: { levelName: LOP9_LEVEL },
    update: { active: true },
    create: { levelName: LOP9_LEVEL, active: true },
  });

  const existing = await findLop9CourseByUnit(prisma, unit);
  if (existing) {
    // Keep canonical title if unit number matches an older name.
    if (existing.name !== name) {
      await prisma.course.update({
        where: { id: existing.id },
        data: { name },
      });
      return { id: existing.id, name };
    }
    return existing;
  }

  const created = await prisma.course.create({
    data: {
      name,
      levelName: LOP9_LEVEL,
      active: true,
      enabledSkills: ['listening', 'reading', 'speaking', 'writing', 'vocabulary'],
      enabledGames: [],
    },
    select: { id: true, name: true },
  });
  return created;
}
