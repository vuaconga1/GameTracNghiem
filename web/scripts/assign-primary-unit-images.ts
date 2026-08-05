/**
 * Assign primary Grade 2/3/5 unit thumbnails to Course.backgroundImageUrl.
 *
 * Usage:
 *   npx tsx scripts/generate-primary-unit-images.ts --grade=all
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-primary-unit-images.ts --grade=all
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { findCourseByUnit, unitCourseName } from '../lib/primaryGradeConfig';
import { parsePrimaryGradeArg, PRIMARY_GRADE_SPECS } from '../lib/primaryGradeSpecs';
import { primaryUnitImagePath } from '../lib/primaryUnitThumbnails';

async function main() {
  const grades = parsePrimaryGradeArg(process.argv.slice(2));
  for (const grade of grades) {
    const spec = PRIMARY_GRADE_SPECS[grade];
    let ok = 0;
    for (let unit = 1; unit <= spec.unitCount; unit += 1) {
      const course = await findCourseByUnit(prisma, spec.levelName, unit);
      if (!course) {
        console.warn(
          `Skip: không có ${spec.levelName} / ${unitCourseName(unit, spec.titles[unit] || '')}`,
        );
        continue;
      }
      const backgroundImageUrl = primaryUnitImagePath(grade, unit);
      await prisma.course.update({
        where: { id: course.id },
        data: { backgroundImageUrl, backgroundImageKey: null },
      });
      ok += 1;
      console.log(
        `${spec.levelName} Unit ${String(unit).padStart(2, '0')}: ${course.name} → ${backgroundImageUrl}`,
      );
    }
    console.log(`\n${spec.levelName} done: ${ok}/${spec.unitCount} course(s) updated.`);
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
