import type { PrismaClient } from '@prisma/client';

import {
  deriveEnabledGamesFromSkills,
  SKILL_IDS,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';

export const LOP1_LEVEL = 'Lớp 1';

/** Global Success 1 — 16 units (Student's Book / Bài tập). */
export const LOP1_UNIT_TITLES: Record<number, string> = {
  1: 'In The School Playground',
  2: 'In The Dining Room',
  3: 'At The Street Market',
  4: 'In The Bedroom',
  5: 'At The Fish And Chip Shop',
  6: 'In The Classroom',
  7: 'In The Garden',
  8: 'In The Park',
  9: 'In The Shop',
  10: 'At The Zoo',
  11: 'At The Bus Stop',
  12: 'At The Lake',
  13: 'In The School Canteen',
  14: 'In The Toy Shop',
  15: 'At The Football Match',
  16: 'At Home',
};

export const LOP1_UNIT_COUNT = 16;

/**
 * Grade 1 game skill map (admin screenshot):
 * pronunciation → Nói; scramble → Từ vựng; word_match + reading exercise games → Đọc;
 * choose_and_circle → all skills; look_and_write / grammar / quiz → Ẩn.
 */
export const LOP1_GAME_SKILLS: GameSkillsMap = {
  pronunciation: 'speaking',
  scramble: 'vocabulary',
  word_match: 'reading',
  look_and_write: null,
  choose_and_circle: [...SKILL_IDS],
  read_and_complete: 'reading',
  read_and_match: 'reading',
  vocabulary_test: 'reading',
  vocabulary_check: 'reading',
  grammar: null,
  quiz: null,
};

export const LOP1_ENABLED_SKILLS: SkillId[] = [...SKILL_IDS];

export const LOP1_ENABLED_GAMES = deriveEnabledGamesFromSkills(
  LOP1_GAME_SKILLS,
  LOP1_ENABLED_SKILLS,
);

/** Games that receive vocabulary content for Grade 1. */
export const LOP1_VOCAB_GAME_KEYS = [
  'pronunciation',
  'scramble',
  'word_match',
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
] as const;

export function lop1UnitCourseName(unit: number): string {
  const title = LOP1_UNIT_TITLES[unit];
  if (!title) {
    throw new Error(`Unknown Lớp 1 unit number: ${unit}`);
  }
  return `Unit ${unit}: ${title}`;
}

/** Parse unit number from "Unit N" or "Unit N: Title". */
export function parseLop1UnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

type CourseRow = { id: string; name: string };

export async function findLop1CourseByUnit(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow | null> {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP1_LEVEL, archivedAt: null },
    select: { id: true, name: true },
  });

  return (
    courses.find((course) => parseLop1UnitNumber(course.name) === unit) ?? null
  );
}

/** Create ClassLevel + Course for a unit if missing; refresh skills/games map. */
export async function ensureLop1Course(
  prisma: PrismaClient,
  unit: number,
): Promise<CourseRow> {
  const name = lop1UnitCourseName(unit);

  await prisma.classLevel.upsert({
    where: { levelName: LOP1_LEVEL },
    update: { active: true, archivedAt: null },
    create: { levelName: LOP1_LEVEL, active: true },
  });

  const existing = await findLop1CourseByUnit(prisma, unit);
  if (existing) {
    await prisma.course.update({
      where: { id: existing.id },
      data: {
        name,
        active: true,
        archivedAt: null,
        enabledSkills: LOP1_ENABLED_SKILLS,
        enabledGames: LOP1_ENABLED_GAMES,
        gameSkills: LOP1_GAME_SKILLS,
      },
    });
    return { id: existing.id, name };
  }

  const created = await prisma.course.create({
    data: {
      name,
      levelName: LOP1_LEVEL,
      active: true,
      enabledSkills: LOP1_ENABLED_SKILLS,
      enabledGames: LOP1_ENABLED_GAMES,
      gameSkills: LOP1_GAME_SKILLS,
    },
    select: { id: true, name: true },
  });
  return created;
}
