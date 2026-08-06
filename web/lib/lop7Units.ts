import type { PrismaClient } from '@prisma/client';

export const LOP7_LEVEL = 'Lớp 7';

/** Global Success 7 — first semester units 1–6 (HK1). */
export const LOP7_UNIT_TITLES: Record<number, string> = {
  1: 'Hobbies',
  2: 'Healthy Living',
  3: 'Community Service',
  4: 'Music And Arts',
  5: 'Food And Drink',
  6: 'A Visit To A School',
};

export const LOP7_UNIT_COUNT = 6;

export function lop7UnitCourseName(unit: number): string {
  const title = LOP7_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 7 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
}

export function parseLop7UnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

type CourseRow = { id: string; name: string };

export async function findLop7CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP7_LEVEL, archivedAt: null },
    select: { id: true, name: true },
  });
  return (
    courses.find((course) => parseLop7UnitNumber(course.name) === unit) ?? null
  );
}

export async function ensureLop7Course(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow> {
  const name = lop7UnitCourseName(unit);

  await prisma.classLevel.upsert({
    where: { levelName: LOP7_LEVEL },
    update: { active: true },
    create: { levelName: LOP7_LEVEL, active: true },
  });

  const existing = await findLop7CourseByUnit(prisma, unit);
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

  return prisma.course.create({
    data: {
      name,
      levelName: LOP7_LEVEL,
      active: true,
      enabledSkills: ['listening', 'reading', 'speaking', 'writing', 'vocabulary'],
      enabledGames: [],
    },
    select: { id: true, name: true },
  });
}
