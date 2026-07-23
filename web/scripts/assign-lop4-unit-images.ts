/**
 * Assign public Lớp 4 unit thumbnail paths to Course.backgroundImageUrl.
 *
 * Usage:
 *   npx tsx scripts/generate-lop4-unit-images.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/assign-lop4-unit-images.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-lop4-unit-images.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  LOP4_LEVEL,
  LOP4_UNIT_COUNT,
  findLop4CourseByUnit,
  lop4UnitCourseName,
} from '../lib/lop4Units';
import { lop4UnitImagePath } from '../lib/lop4UnitThumbnails';

type AssignResult = {
  unit: number;
  courseId: string;
  courseName: string;
  backgroundImageUrl: string;
};

async function main() {
  const results: AssignResult[] = [];

  for (let unit = 1; unit <= LOP4_UNIT_COUNT; unit += 1) {
    const course = await findLop4CourseByUnit(prisma, unit);
    if (!course) {
      console.warn(`Skip: không có ${LOP4_LEVEL} / ${lop4UnitCourseName(unit)}`);
      continue;
    }

    const backgroundImageUrl = lop4UnitImagePath(unit);

    await prisma.course.update({
      where: { id: course.id },
      data: {
        backgroundImageUrl,
        backgroundImageKey: null,
      },
    });

    results.push({
      unit,
      courseId: course.id,
      courseName: course.name,
      backgroundImageUrl,
    });

    console.log(`Unit ${String(unit).padStart(2, '0')}: ${course.name} → ${backgroundImageUrl}`);
  }

  console.log('\n| Unit | Course | Image |');
  console.log('| ---: | --- | --- |');
  for (const row of results) {
    console.log(`| ${row.unit} | ${row.courseName} | ${row.backgroundImageUrl} |`);
  }

  const missing = Array.from({ length: LOP4_UNIT_COUNT }, (_, index) => index + 1).filter(
    (unit) => !results.some((row) => row.unit === unit),
  );

  console.log(`\nDone: ${results.length}/${LOP4_UNIT_COUNT} course(s) updated.`);

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
