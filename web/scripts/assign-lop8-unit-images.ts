/**
 * Assign public Lớp 8 unit thumbnail paths to Course.backgroundImageUrl (units 1–6).
 *
 * Usage:
 *   npx tsx scripts/generate-lop8-unit-images.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/assign-lop8-unit-images.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-lop8-unit-images.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  LOP8_LEVEL,
  LOP8_UNIT_COUNT,
  LOP8_UNIT_TITLES,
  findLop8CourseByUnit,
} from '../lib/lop8Units';
import { lop8UnitImagePath } from '../lib/lop8UnitThumbnails';

type AssignResult = {
  unit: number;
  theme: string;
  courseId: string;
  courseName: string;
  backgroundImageUrl: string;
};

async function main() {
  const results: AssignResult[] = [];

  for (let unit = 1; unit <= LOP8_UNIT_COUNT; unit += 1) {
    const course = await findLop8CourseByUnit(prisma, unit);
    if (!course) {
      console.warn(`Skip: không có ${LOP8_LEVEL} / Unit ${unit}`);
      continue;
    }

    const backgroundImageUrl = lop8UnitImagePath(unit);

    await prisma.course.update({
      where: { id: course.id },
      data: {
        backgroundImageUrl,
        backgroundImageKey: null,
      },
    });

    results.push({
      unit,
      theme: LOP8_UNIT_TITLES[unit],
      courseId: course.id,
      courseName: course.name,
      backgroundImageUrl,
    });

    console.log(
      `Unit ${String(unit).padStart(2, '0')}: ${course.name} → ${backgroundImageUrl}`,
    );
  }

  console.log('\n| Unit | Theme | Course | Image |');
  console.log('| ---: | --- | --- | --- |');
  for (const row of results) {
    console.log(
      `| ${row.unit} | ${row.theme} | ${row.courseName} | ${row.backgroundImageUrl} |`,
    );
  }

  const missing = Array.from({ length: LOP8_UNIT_COUNT }, (_, index) => index + 1).filter(
    (unit) => !results.some((row) => row.unit === unit),
  );

  console.log(`\nDone: ${results.length}/${LOP8_UNIT_COUNT} course(s) updated.`);

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
