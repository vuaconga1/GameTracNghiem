/**
 * Move quiz:reading → vocabulary on existing courses; ensure vocabulary in enabledSkills.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/migrate-quiz-to-vocabulary.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { buildPgPoolConfig } from '../lib/db';
import {
  deriveEnabledGamesFromSkills,
  migrateQuizReadingToVocabulary,
  normalizeGameSkillsMap,
} from '../lib/skillCatalog';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const pool = new Pool(buildPgPoolConfig(connectionString));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      gameSkills: true,
      enabledSkills: true,
    },
  });

  let updated = 0;
  for (const course of courses) {
    const beforeMap = normalizeGameSkillsMap(course.gameSkills);
    const beforeSkills = [...(course.enabledSkills || [])].sort().join(',');
    const { gameSkills, enabledSkills } = migrateQuizReadingToVocabulary(
      beforeMap,
      course.enabledSkills
    );
    const afterSkills = [...enabledSkills].sort().join(',');
    const mapChanged = beforeMap.quiz !== gameSkills.quiz;
    const skillsChanged = beforeSkills !== afterSkills;

    if (!mapChanged && !skillsChanged) continue;

    await prisma.course.update({
      where: { id: course.id },
      data: {
        gameSkills,
        enabledSkills,
        enabledGames: deriveEnabledGamesFromSkills(gameSkills, enabledSkills),
      },
    });
    updated += 1;
  }

  console.log(`Updated ${updated} course(s) for quiz→vocabulary.`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
