/**
 * Set Lớp 4 course names to "Unit N: {Title}" from Global Success 4 PDF.
 * Migrates GameProgress.courseKey and ScoreLog.course from legacy "Unit N|Lớp 4".
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/update-lop4-unit-names.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/update-lop4-unit-names.ts
 */
import '../lib/loadEnv';

import { progressCourseKey } from '../lib/courseKey';
import { prisma } from '../lib/db';
import {
  LOP4_LEVEL,
  LOP4_UNIT_COUNT,
  LOP4_UNIT_TITLES,
  legacyLop4ProgressCourseKey,
  legacyLop4UnitCourseName,
  lop4ProgressCourseKey,
  lop4UnitCourseName,
  parseLop4UnitNumber,
} from '../lib/lop4Units';

type UpdateResult = {
  unit: number;
  oldName: string;
  newName: string;
  courseId: string;
  progressRows: number;
  scoreRows: number;
};

async function main() {
  const results: UpdateResult[] = [];

  for (let unit = 1; unit <= LOP4_UNIT_COUNT; unit++) {
    const newName = lop4UnitCourseName(unit);
    const legacyName = legacyLop4UnitCourseName(unit);
    const legacyKey = legacyLop4ProgressCourseKey(unit);
    const newKey = lop4ProgressCourseKey(unit);

    const course = await prisma.course.findFirst({
      where: {
        levelName: LOP4_LEVEL,
        archivedAt: null,
        OR: [{ name: legacyName }, { name: newName }],
      },
    });

    if (!course) {
      console.warn(`Skip: không có ${LOP4_LEVEL} / ${legacyName}`);
      continue;
    }

    const parsed = parseLop4UnitNumber(course.name);
    if (parsed !== unit) {
      console.warn(
        `Skip: ${course.name} (${course.id}) không khớp unit ${unit}`,
      );
      continue;
    }

    const oldName = course.name;

    if (oldName !== newName) {
      await prisma.course.update({
        where: { id: course.id },
        data: { name: newName },
      });
    }

    const progressRows = await prisma.gameProgress.updateMany({
      where: { courseKey: legacyKey },
      data: { courseKey: newKey },
    });

    const scoreRows = await prisma.scoreLog.updateMany({
      where: {
        OR: [
          { course: legacyKey },
          { course: legacyName },
          { course: progressCourseKey(legacyName, LOP4_LEVEL) },
        ],
      },
      data: { course: newKey },
    });

    results.push({
      unit,
      oldName,
      newName,
      courseId: course.id,
      progressRows: progressRows.count,
      scoreRows: scoreRows.count,
    });

    console.log(
      `${oldName === newName ? 'ok      ' : 'updated '} Unit ${unit}: ${oldName} → ${newName}` +
        ` (progress ${progressRows.count}, scores ${scoreRows.count})`,
    );
  }

  console.log('\nMapping:');
  console.log('| Unit | Course name |');
  console.log('| ---: | --- |');
  for (let unit = 1; unit <= LOP4_UNIT_COUNT; unit++) {
    console.log(`| ${unit} | ${lop4UnitCourseName(unit)} |`);
  }

  const changed = results.filter((row) => row.oldName !== row.newName).length;
  const migratedProgress = results.reduce((sum, row) => sum + row.progressRows, 0);
  const migratedScores = results.reduce((sum, row) => sum + row.scoreRows, 0);

  console.log(
    `\nDone: ${results.length} course(s), ${changed} renamed, ` +
      `${migratedProgress} progress row(s), ${migratedScores} score row(s).`,
  );

  const missing = Object.keys(LOP4_UNIT_TITLES)
    .map(Number)
    .filter((unit) => !results.some((row) => row.unit === unit));
  if (missing.length) {
    console.warn(`Missing units: ${missing.join(', ')}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
