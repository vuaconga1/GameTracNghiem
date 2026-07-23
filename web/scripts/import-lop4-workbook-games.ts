/**
 * Import Global Success 4 workbook content into existing Lớp 4 Unit 1-19 courses.
 *
 * Game mapping:
 * - word_match: workbook picture-match exercise where available (Unit 1-10)
 * - read_and_complete: workbook fill-in-the-blanks exercise (Unit 1-19)
 * - quiz: workbook complete-word / multiple-choice exercise (Unit 1-19)
 *
 * Usage:
 *   npx tsx scripts/generate-lop4-word-match-images.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop4-workbook-games.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop4-workbook-games.ts
 */
import '../lib/loadEnv';

import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  getLop4WorkbookUnit,
  lop4WordMatchImagePath,
  LOP4_WORKBOOK_UNITS,
} from '../lib/lop4WorkbookContent';
import { findLop4CourseByUnit, LOP4_LEVEL } from '../lib/lop4Units';

const PREFIXES = {
  word_match: 'GS4-WM-WB',
  read_and_complete: 'GS4-RAC-WB',
  quiz: 'GS4-QUIZ-WB',
} as const;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function archiveImportedRows(courseId: string, game: keyof typeof PREFIXES, unit: number) {
  const prefix = `${PREFIXES[game]}-U${unit}-`;
  await prisma.question.updateMany({
    where: {
      courseId,
      game,
      active: true,
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { active: false, archivedAt: new Date() },
  });
}

async function ensureLesson(courseId: string, gameKey: keyof typeof PREFIXES, page: number) {
  await prisma.courseGameLesson.upsert({
    where: { courseId_gameKey: { courseId, gameKey } },
    update: { pageStart: page, pageEnd: page },
    create: { courseId, gameKey, pageStart: page, pageEnd: page },
  });
}

async function importWordMatch(courseId: string, unit: number) {
  const workbook = getLop4WorkbookUnit(unit);
  await archiveImportedRows(courseId, 'word_match', unit);

  if (workbook.wordMatch.items.length === 0) {
    return 0;
  }

  await ensureLesson(courseId, 'word_match', workbook.page);

  let created = 0;
  for (let index = 0; index < workbook.wordMatch.items.length; index += 1) {
    const item = workbook.wordMatch.items[index];
    const payload = parseGamePayload('word_match', {
      word: item.word,
      hint: item.hint,
      image: lop4WordMatchImagePath(unit, item.cropKey),
    });
    await prisma.question.create({
      data: {
        courseId,
        game: 'word_match',
        active: true,
        sortOrder: index + 1,
        externalId: `${PREFIXES.word_match}-U${unit}-${String(index + 1).padStart(2, '0')}-${slugify(item.word)}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }

  return created;
}

async function importReadAndComplete(courseId: string, unit: number) {
  const workbook = getLop4WorkbookUnit(unit);
  await archiveImportedRows(courseId, 'read_and_complete', unit);
  await ensureLesson(courseId, 'read_and_complete', workbook.page);

  const payload = parseGamePayload('read_and_complete', {
    title: workbook.readAndComplete.title,
    instruction: workbook.readAndComplete.instruction,
    word_bank: workbook.readAndComplete.wordBank,
    items: workbook.readAndComplete.items.map((item, index) => ({
      order: index + 1,
      sentence: item.sentence,
      image: '',
      answer: item.answer,
    })),
  });

  await prisma.question.create({
    data: {
      courseId,
      game: 'read_and_complete',
      active: true,
      sortOrder: 1,
      externalId: `${PREFIXES.read_and_complete}-U${unit}-01`,
      payload: payload as Prisma.InputJsonValue,
    },
  });

  return workbook.readAndComplete.items.length;
}

async function importQuiz(courseId: string, unit: number) {
  const workbook = getLop4WorkbookUnit(unit);
  await archiveImportedRows(courseId, 'quiz', unit);
  await ensureLesson(courseId, 'quiz', workbook.page);

  let created = 0;
  for (let index = 0; index < workbook.quiz.items.length; index += 1) {
    const item = workbook.quiz.items[index];
    const payload = parseGamePayload('quiz', {
      type: item.type,
      typeLabel: item.typeLabel,
      question: item.question,
      answer: item.answer,
      options: item.options ?? [],
      accept: item.accept ?? [],
      fillMode: item.fillMode ?? item.type === 'fill_blank',
    });

    await prisma.question.create({
      data: {
        courseId,
        game: 'quiz',
        active: true,
        sortOrder: index + 1,
        externalId: `${PREFIXES.quiz}-U${unit}-${String(index + 1).padStart(2, '0')}-${slugify(item.answer)}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }

  return created;
}

async function importUnit(unit: number) {
  const course = await findLop4CourseByUnit(prisma, unit);
  if (!course) {
    throw new Error(`Không tìm thấy khóa ${LOP4_LEVEL} / Unit ${unit}`);
  }

  const wordMatchCount = await importWordMatch(course.id, unit);
  const readAndCompleteCount = await importReadAndComplete(course.id, unit);
  const quizCount = await importQuiz(course.id, unit);

  console.log(
    `${course.name}: word_match=${wordMatchCount}, read_and_complete=${readAndCompleteCount}, quiz=${quizCount}`,
  );

  return { wordMatchCount, readAndCompleteCount, quizCount };
}

async function main() {
  const totals = {
    wordMatch: 0,
    readAndComplete: 0,
    quiz: 0,
  };

  for (const unit of LOP4_WORKBOOK_UNITS.map((item) => item.unit)) {
    const counts = await importUnit(unit);
    totals.wordMatch += counts.wordMatchCount;
    totals.readAndComplete += counts.readAndCompleteCount;
    totals.quiz += counts.quizCount;
  }

  console.log('\nDone.');
  console.log(`  word_match items: ${totals.wordMatch}`);
  console.log(`  read_and_complete blanks: ${totals.readAndComplete}`);
  console.log(`  quiz questions: ${totals.quiz}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
