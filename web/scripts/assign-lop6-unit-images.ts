/**
 * Assign public Lớp 6 unit thumbnail paths to Course.backgroundImageUrl (units 1–12).
 *
 * Usage:
 *   npx tsx scripts/split-lop6-unit-thumbs.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-lop6-unit-images.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/assign-lop6-unit-images.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  LOP6_LEVEL,
  LOP6_UNIT_COUNT,
  findLop6CourseByUnit,
  lop6UnitCourseName,
} from '../lib/lop6Units';
import { lop6UnitImagePath } from '../lib/lop6UnitThumbnails';

type AssignResult = {
  unit: number;
  courseId: string;
  courseName: string;
  backgroundImageUrl: string;
};

function parseFromUnit() {
  const index = process.argv.indexOf('--from-unit');
  if (index < 0) return 1;
  const unit = Number(process.argv[index + 1]);
  if (!Number.isInteger(unit) || unit < 1 || unit > LOP6_UNIT_COUNT) {
    throw new Error(`Use --from-unit between 1 and ${LOP6_UNIT_COUNT}`);
  }
  return unit;
}

async function main() {
  const results: AssignResult[] = [];
  const fromUnit = parseFromUnit();

  for (let unit = fromUnit; unit <= LOP6_UNIT_COUNT; unit += 1) {
    const course = await findLop6CourseByUnit(prisma, unit);
    if (!course) {
      console.warn(`Skip: không có ${LOP6_LEVEL} / ${lop6UnitCourseName(unit)}`);
      continue;
    }

    const backgroundImageUrl = lop6UnitImagePath(unit);

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

  console.log(`\nDone: ${results.length}/${LOP6_UNIT_COUNT - fromUnit + 1} course(s) updated.`);

  const missing = Array.from(
    { length: LOP6_UNIT_COUNT - fromUnit + 1 },
    (_, index) => index + fromUnit,
  ).filter(
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
