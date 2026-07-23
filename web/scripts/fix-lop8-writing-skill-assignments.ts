/**
 * Fix Lớp 8 Units 1–6 skill assignments for Writing / Vocabulary:
 *   scramble → vocabulary (exclusive)
 *   look_and_write → null (hidden)
 * Leaves grammar / quiz / choose_and_circle as already configured.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/fix-lop8-writing-skill-assignments.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/fix-lop8-writing-skill-assignments.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { findLop8CourseByUnit, LOP8_LEVEL } from '../lib/lop8Units';
import {
  deriveEnabledGamesFromSkills,
  gameKeysForSkill,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  skillsForGame,
  SKILL_IDS,
  type GameSkillsMap,
} from '../lib/skillCatalog';

const UNITS = [1, 2, 3, 4, 5, 6] as const;

function applyFix(map: GameSkillsMap): { map: GameSkillsMap; changed: boolean } {
  const next: GameSkillsMap = { ...map };
  let changed = false;

  if (next.scramble !== 'vocabulary') {
    next.scramble = 'vocabulary';
    changed = true;
  }

  if (next.look_and_write !== null && next.look_and_write !== undefined) {
    next.look_and_write = null;
    changed = true;
  } else if (next.look_and_write === undefined) {
    // Explicit null so resolveGameSkillsMap keeps the key hidden after write.
    next.look_and_write = null;
    changed = true;
  }

  return { map: next, changed };
}

function summarize(map: GameSkillsMap) {
  return {
    writing: gameKeysForSkill(map, 'writing'),
    vocabulary: gameKeysForSkill(map, 'vocabulary'),
    scramble: skillsForGame(map.scramble),
    look_and_write: skillsForGame(map.look_and_write),
  };
}

async function fixUnit(unit: number) {
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    console.log(`${LOP8_LEVEL} Unit ${unit}: course missing — skip`);
    return;
  }

  const row = await prisma.course.findUnique({
    where: { id: course.id },
    select: {
      id: true,
      name: true,
      gameSkills: true,
      enabledSkills: true,
      enabledGames: true,
    },
  });
  if (!row) return;

  const beforeMap = normalizeGameSkillsMap(row.gameSkills);
  const before = summarize(beforeMap);
  const { map, changed: mapChanged } = applyFix(beforeMap);

  const enabledSet = new Set(resolveEnabledSkillIds(row.enabledSkills));
  // Scramble under vocabulary requires the vocabulary skill card.
  enabledSet.add('vocabulary');
  const enabledSkills = SKILL_IDS.filter((id) => enabledSet.has(id));
  const skillsChanged =
    [...resolveEnabledSkillIds(row.enabledSkills)].join(',') !== enabledSkills.join(',');

  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, row.enabledGames);
  const after = summarize(map);

  if (!mapChanged && !skillsChanged) {
    console.log(`\n=== ${row.name} (${row.id}) — already OK ===`);
  } else {
    await prisma.course.update({
      where: { id: row.id },
      data: {
        gameSkills: map as Prisma.InputJsonValue,
        enabledSkills,
        enabledGames,
      },
    });
    console.log(`\n=== ${row.name} (${row.id}) — updated ===`);
  }

  console.log(`  before writing: [${before.writing.join(', ')}]`);
  console.log(`  after  writing: [${after.writing.join(', ')}]`);
  console.log(`  before vocabulary: [${before.vocabulary.join(', ')}]`);
  console.log(`  after  vocabulary: [${after.vocabulary.join(', ')}]`);
  console.log(`  scramble: ${after.scramble.join(',') || '(hidden)'} | look_and_write: ${after.look_and_write.join(',') || '(hidden)'}`);
}

async function main() {
  for (const unit of UNITS) {
    await fixUnit(unit);
  }
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
