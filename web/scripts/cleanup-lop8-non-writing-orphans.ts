/**
 * Cleanup Lớp 8 Units 1–6 questions that are not from known intentional imports.
 *
 * Writing games (grammar, quiz, choose_and_circle):
 *   keep only GS8-WRITE-* (from Writing_Lop8.docx)
 *
 * Other games:
 *   keep GS8-SCRAMBLE-*, U1-L8-LEISURE-*, and other GS8-* prefixes
 *   archive numeric/null/demo orphans (Apple/Tablet placeholders, HK2 leftovers, …)
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/cleanup-lop8-non-writing-orphans.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { findLop8CourseByUnit, LOP8_LEVEL } from '../lib/lop8Units';
import {
  compactSkillAssignment,
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';

const WRITE_PREFIX = 'GS8-WRITE-';
const READ_PREFIX = 'GS8-READ-';
const KEEP_PREFIXES = [
  'GS8-WRITE-',
  'GS8-READ-',
  'GS8-SCRAMBLE-',
  'U1-L8-LEISURE-',
] as const;

/** Games that Writing/Reading imports populate — only known prefixes survive. */
const WRITING_GAMES = new Set(['grammar', 'quiz', 'choose_and_circle']);

type Row = {
  id: string;
  game: string;
  externalId: string | null;
  payload: unknown;
};

function preview(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  return String(p.question || p.prefix || p.word || p.title || p.targetText || '').slice(0, 70);
}

function isNumericId(externalId: string | null): boolean {
  return Boolean(externalId && /^\d+$/.test(externalId));
}

function shouldKeep(row: Row): boolean {
  const id = row.externalId || '';

  if (WRITING_GAMES.has(row.game)) {
    // quiz holds both Writing and Reading imports
    if (row.game === 'quiz') {
      return id.startsWith(WRITE_PREFIX) || id.startsWith(READ_PREFIX);
    }
    return id.startsWith(WRITE_PREFIX);
  }

  // Intentional imports from other files / Unit 1 leisure fill.
  if (KEEP_PREFIXES.some((prefix) => id.startsWith(prefix))) return true;
  if (id.startsWith('GS8-')) return true;

  // Everything else on Lớp 8 non-writing games is treated as leftover demo/junk.
  return false;
}

async function syncChooseAndCircleSkills(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const activeCircle = await prisma.question.findMany({
    where: {
      courseId,
      game: 'choose_and_circle',
      active: true,
      archivedAt: null,
    },
    select: { externalId: true },
  });

  const map = normalizeGameSkillsMap(course.gameSkills);

  if (!activeCircle.length) {
    map.choose_and_circle = null;
  } else {
    const hasWrite = activeCircle.some((q) => q.externalId?.startsWith(WRITE_PREFIX));
    const hasOther = activeCircle.some((q) => !q.externalId?.startsWith(WRITE_PREFIX));
    const next = new Set<string>();
    if (hasWrite) next.add('writing');
    if (hasOther) next.add('reading');
    if (hasWrite && !hasOther) {
      next.clear();
      next.add('writing');
    }
    map.choose_and_circle = compactSkillAssignment(
      SKILL_IDS.filter((id) => next.has(id)),
      true
    );
  }

  const enabledSkills = resolveEnabledSkillIds(course.enabledSkills);
  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, course.enabledGames);
  await prisma.course.update({
    where: { id: courseId },
    data: {
      gameSkills: map as Prisma.InputJsonValue,
      enabledGames,
    },
  });
}

async function cleanupUnit(unit: number) {
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    console.log(`${LOP8_LEVEL} Unit ${unit}: course missing — skip`);
    return;
  }

  const rows = await prisma.question.findMany({
    where: { courseId: course.id, active: true, archivedAt: null },
    select: { id: true, game: true, externalId: true, payload: true },
  });

  const keep = rows.filter(shouldKeep);
  const drop = rows.filter((row) => !shouldKeep(row));

  if (drop.length) {
    await prisma.question.updateMany({
      where: { id: { in: drop.map((r) => r.id) } },
      data: { archivedAt: new Date(), active: false },
    });
  }

  await syncChooseAndCircleSkills(course.id);

  const keptByGame = new Map<string, number>();
  const droppedByGame = new Map<string, number>();
  for (const row of keep) {
    keptByGame.set(row.game, (keptByGame.get(row.game) || 0) + 1);
  }
  for (const row of drop) {
    droppedByGame.set(row.game, (droppedByGame.get(row.game) || 0) + 1);
  }

  console.log(`\n=== ${course.name} ===`);
  console.log(`  kept=${keep.length} archived=${drop.length}`);
  for (const game of [...new Set([...keptByGame.keys(), ...droppedByGame.keys()])].sort()) {
    console.log(
      `  ${game}: keep ${keptByGame.get(game) || 0} | archive ${droppedByGame.get(game) || 0}`
    );
  }
  if (drop.length) {
    console.log('  archived samples:');
    for (const row of drop.slice(0, 12)) {
      const kind = isNumericId(row.externalId) ? 'numeric' : row.externalId || '(null)';
      console.log(`    [${row.game}] ${kind} :: ${preview(row.payload)}`);
    }
    if (drop.length > 12) console.log(`    ... +${drop.length - 12} more`);
  }
}

async function main() {
  for (const unit of [1, 2, 3, 4, 5, 6]) {
    await cleanupUnit(unit);
  }
  console.log('\nCleanup done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
