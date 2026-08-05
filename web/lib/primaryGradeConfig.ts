import type { PrismaClient } from '@prisma/client';

import {
  deriveEnabledGamesFromSkills,
  SKILL_IDS,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';

/** Shared Grade 1–5 primary game skill map (same as Lớp 1 admin screenshot). */
export const PRIMARY_GAME_SKILLS: GameSkillsMap = {
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

export const PRIMARY_ENABLED_SKILLS: SkillId[] = [...SKILL_IDS];

export const PRIMARY_ENABLED_GAMES = deriveEnabledGamesFromSkills(
  PRIMARY_GAME_SKILLS,
  PRIMARY_ENABLED_SKILLS,
);

export const PRIMARY_VOCAB_GAME_KEYS = [
  'pronunciation',
  'scramble',
  'word_match',
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
] as const;

export type PrimaryVocabItem = { word: string; hint: string; ipa?: string };

export type PrimaryUnitVocab = {
  unit: number;
  title: string;
  sound?: string;
  words: PrimaryVocabItem[];
};

export function parseUnitNumber(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

export function unitCourseName(unit: number, title: string): string {
  return `Unit ${unit}: ${title}`;
}

export async function findCourseByUnit(
  prisma: PrismaClient,
  levelName: string,
  unit: number,
): Promise<{ id: string; name: string } | null> {
  const courses = await prisma.course.findMany({
    where: { levelName, archivedAt: null },
    select: { id: true, name: true },
  });
  return courses.find((c) => parseUnitNumber(c.name) === unit) ?? null;
}

export async function ensurePrimaryCourse(
  prisma: PrismaClient,
  opts: { levelName: string; unit: number; title: string },
): Promise<{ id: string; name: string }> {
  const name = unitCourseName(opts.unit, opts.title);

  await prisma.classLevel.upsert({
    where: { levelName: opts.levelName },
    update: { active: true, archivedAt: null },
    create: { levelName: opts.levelName, active: true },
  });

  const existing = await findCourseByUnit(prisma, opts.levelName, opts.unit);
  if (existing) {
    await prisma.course.update({
      where: { id: existing.id },
      data: {
        name,
        active: true,
        archivedAt: null,
        enabledSkills: PRIMARY_ENABLED_SKILLS,
        enabledGames: PRIMARY_ENABLED_GAMES,
        gameSkills: PRIMARY_GAME_SKILLS,
      },
    });
    return { id: existing.id, name };
  }

  return prisma.course.create({
    data: {
      name,
      levelName: opts.levelName,
      active: true,
      enabledSkills: PRIMARY_ENABLED_SKILLS,
      enabledGames: PRIMARY_ENABLED_GAMES,
      gameSkills: PRIMARY_GAME_SKILLS,
    },
    select: { id: true, name: true },
  });
}

export function slugifyWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
