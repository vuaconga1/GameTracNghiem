/**
 * Assign public Lớp 7 unit thumbnail paths to Course.backgroundImageUrl (units 1–6).
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/assign-lop7-unit-images.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-lop7-unit-images.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  LOP7_LEVEL,
  LOP7_UNIT_COUNT,
  findLop7CourseByUnit,
  lop7UnitCourseName,
} from '../lib/lop7Units';
import { lop7UnitImagePath } from '../lib/lop7UnitThumbnails';

type AssignResult = {
  unit: number;
  courseId: string;
  courseName: string;
  backgroundImageUrl: string;
};

async function main() {
  const results: AssignResult[] = [];

  for (let unit = 1; unit <= LOP7_UNIT_COUNT; unit += 1) {
    const course = await findLop7CourseByUnit(prisma, unit);
    if (!course) {
      console.warn(`Skip: không có ${LOP7_LEVEL} / ${lop7UnitCourseName(unit)}`);
      continue;
    }

    const backgroundImageUrl = lop7UnitImagePath(unit);

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

    console.log(
      `Unit ${String(unit).padStart(2, '0')}: ${course.name} → ${backgroundImageUrl}`,
    );
  }

  console.log(`\nDone: ${results.length}/${LOP7_UNIT_COUNT} course(s) updated.`);

  const missing = Array.from({ length: LOP7_UNIT_COUNT }, (_, index) => index + 1).filter(
    (unit) => !results.some((row) => row.unit === unit),
  );
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
