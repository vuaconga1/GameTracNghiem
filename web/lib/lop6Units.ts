import type { PrismaClient } from '@prisma/client';

export const LOP6_LEVEL = 'Lớp 6';

/** Global Success 6 — first semester units 1–6 (HK1). */
export const LOP6_UNIT_TITLES: Record<number, string> = {
  1: 'My New School',
  2: 'My Home',
  3: 'My Friends',
  4: 'My Neighbourhood',
  5: 'Natural Wonders Of Viet Nam',
  6: 'Our Tet Holiday',
};

export const LOP6_UNIT_COUNT = 6;

export function lop6UnitCourseName(unit: number): string {
  const title = LOP6_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 6 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
}

/** Parse unit number from "Unit N", "UNIT N: …", etc. */
export function parseLop6UnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

type CourseRow = { id: string; name: string };

export async function findLop6CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP6_LEVEL, archivedAt: null },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop6UnitNumber(course.name) === unit) ?? null
  );
}

export async function findActiveLop6CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP6_LEVEL, archivedAt: null, active: true },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop6UnitNumber(course.name) === unit) ?? null
  );
}

/** Create ClassLevel + Course for a unit if missing. */
export async function ensureLop6Course(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow> {
  const name = lop6UnitCourseName(unit);

  await prisma.classLevel.upsert({
    where: { levelName: LOP6_LEVEL },
    update: { active: true },
    create: { levelName: LOP6_LEVEL, active: true },
  });

  const existing = await findLop6CourseByUnit(prisma, unit);
  if (existing) {
    if (existing.name !== name) {
      await prisma.course.update({
        where: { id: existing.id },
        data: { name, active: true, archivedAt: null },
      });
      return { id: existing.id, name };
    }
    await prisma.course.update({
      where: { id: existing.id },
      data: { active: true, archivedAt: null },
    });
    return existing;
  }

  const created = await prisma.course.create({
    data: {
      name,
      levelName: LOP6_LEVEL,
      active: true,
      enabledSkills: ['listening', 'reading', 'speaking', 'writing', 'vocabulary'],
      enabledGames: [],
    },
    select: { id: true, name: true },
  });
  return created;
}
