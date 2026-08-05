/**
 * Wipe Lớp 4 courses (+ cascaded questions/lessons) on the configured DB.
 * Progress/score string keys are cleaned best-effort.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/wipe-lop4-local.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';

const LEVEL = 'Lớp 4';

async function main() {
  const courses = await prisma.course.findMany({
    where: { levelName: LEVEL },
    select: { id: true, name: true },
  });
  console.log(`Found ${courses.length} Lớp 4 course(s).`);

  const keys = new Set<string>();
  for (const c of courses) {
    keys.add(`${c.name}|${LEVEL}`);
    keys.add(c.name);
    const m = /^Unit\s+(\d+)/i.exec(c.name);
    if (m) {
      keys.add(`Unit ${m[1]}|${LEVEL}`);
      keys.add(`Unit ${m[1]}`);
    }
  }
  const keyList = [...keys];

  const progress = await prisma.gameProgress.deleteMany({
    where: {
      OR: [{ courseKey: { endsWith: `|${LEVEL}` } }, { courseKey: { in: keyList } }],
    },
  });
  const scores = await prisma.scoreLog.deleteMany({
    where: {
      OR: [{ course: { endsWith: `|${LEVEL}` } }, { course: { in: keyList } }],
    },
  });
  const xp = await prisma.experienceGrant.deleteMany({
    where: {
      OR: [{ course: { endsWith: `|${LEVEL}` } }, { course: { in: keyList } }],
    },
  });
  console.log(
    `Deleted progress=${progress.count}, scoreLog=${scores.count}, experienceGrant=${xp.count}`,
  );

  // Questions/lessons/speaking cascade with Course
  const deletedCourses = await prisma.course.deleteMany({ where: { levelName: LEVEL } });
  console.log(`Deleted courses=${deletedCourses.count}`);

  const deletedLevel = await prisma.classLevel.deleteMany({ where: { levelName: LEVEL } });
  console.log(`Deleted classLevel=${deletedLevel.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
