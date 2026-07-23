/**
 * Copy Lớp 4 scramble vocab → pronunciation, per unit (Unit N → Unit N).
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop4-scramble-to-pronunciation.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop4-scramble-to-pronunciation.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import { findLop4CourseByUnit, LOP4_LEVEL } from '../lib/lop4Units';

const LEVEL = LOP4_LEVEL;
const SOURCE_GAME = 'scramble';
const TARGET_GAME = 'pronunciation';
const EXTERNAL_PREFIX = 'GS4-PRON-FROM-SCRAMBLE';
const UNIT_COUNT = 19;

type ScramblePayload = { word?: string; hint?: string };

async function importUnit(unit: number) {
  const course = await findLop4CourseByUnit(prisma, unit);
  if (!course) {
    console.warn(`Skip: không có ${LEVEL} / Unit ${unit}`);
    return 0;
  }
  const courseName = course.name;

  const scrambleRows = await prisma.question.findMany({
    where: {
      courseId: course.id,
      game: SOURCE_GAME,
      active: true,
      archivedAt: null,
    },
    orderBy: { sortOrder: 'asc' },
  });

  if (scrambleRows.length === 0) {
    console.warn(`Skip: ${courseName} chưa có scramble`);
    return 0;
  }

  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: TARGET_GAME,
      archivedAt: null,
      OR: [{ externalId: { startsWith: prefix } }, { externalId: { startsWith: 'GS4-PRON' } }],
    },
    data: { archivedAt: new Date(), active: false },
  });

  // Clean leftover active pronunciation from prior GS4 imports for this course
  await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: TARGET_GAME,
      archivedAt: null,
      externalId: { startsWith: EXTERNAL_PREFIX },
    },
    data: { archivedAt: new Date(), active: false },
  });

  let created = 0;
  for (let i = 0; i < scrambleRows.length; i++) {
    const row = scrambleRows[i];
    const src = (row.payload ?? {}) as ScramblePayload;
    const word = String(src.word || '').trim();
    if (!word) continue;
    const hint = String(src.hint || '').trim();

    const payload = parseGamePayload(TARGET_GAME, {
      mode: 'word',
      modeLabel: 'Luyện từ',
      prompt: `Đọc từ vựng Unit ${unit}`,
      targetText: word,
      targetIpa: '',
      referenceAudioUrl: '',
      hint,
    });

    const slug = word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const externalId = `${prefix}${String(i + 1).padStart(2, '0')}-${slug}`;

    await prisma.question.create({
      data: {
        courseId: course.id,
        game: TARGET_GAME,
        active: true,
        sortOrder: i + 1,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }

  console.log(`${LEVEL} ${courseName}: ${created} phát âm (từ ${scrambleRows.length} scramble)`);
  return created;
}

async function main() {
  let total = 0;
  for (let unit = 1; unit <= UNIT_COUNT; unit++) {
    total += await importUnit(unit);
  }
  console.log(`\nDone: ${total} pronunciation questions across Unit 1–${UNIT_COUNT}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
