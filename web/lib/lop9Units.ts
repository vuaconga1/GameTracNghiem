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

export function lop9UnitCourseName(unit: number): string {
  const title = LOP9_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 9 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
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
