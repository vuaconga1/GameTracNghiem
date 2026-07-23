/**
 * Optional re-runnable backfill for Course.gameSkills / enabledSkills.
 * Prefer the SQL in prisma/migrations/20260723050000_add_course_game_skills.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/backfill-course-game-skills.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import {
  buildGameSkillsFromEnabledGames,
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';
import { buildPgPoolConfig } from '../lib/db';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const pool = new Pool(buildPgPoolConfig(connectionString));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      name: true,
      enabledGames: true,
      gameSkills: true,
      enabledSkills: true,
    },
  });

  let updated = 0;
  for (const course of courses) {
    const existingMap = normalizeGameSkillsMap(course.gameSkills);
    const gameSkills =
      Object.keys(existingMap).length > 0
        ? existingMap
        : buildGameSkillsFromEnabledGames(course.enabledGames);
    const enabledSkills = resolveEnabledSkillIds(course.enabledSkills);
    const enabledGames = deriveEnabledGamesFromSkills(gameSkills, enabledSkills);

    await prisma.course.update({
      where: { id: course.id },
      data: {
        gameSkills,
        enabledSkills: enabledSkills.length ? enabledSkills : [...SKILL_IDS],
        enabledGames,
      },
    });
    updated += 1;
  }

  console.log(`Backfilled gameSkills/enabledSkills for ${updated} course(s).`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
