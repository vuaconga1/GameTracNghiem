/**
 * Assign primary (Lớp 2/3/5) vocab PNG paths into question payloads.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-primary-vocab-images.ts --grade=2,3,5
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-primary-vocab-images.ts --grade=2
 */
import '../lib/loadEnv';

import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { lop2VocabImagePath } from '../lib/lop2VocabImages';
import { lop3VocabImagePath } from '../lib/lop3VocabImages';
import { lop4VocabImagePath } from '../lib/lop4VocabImages';
import { lop5VocabImagePath } from '../lib/lop5VocabImages';
import { findCourseByUnit, slugifyWord } from '../lib/primaryGradeConfig';
import {
  parsePrimaryGradeArg,
  PRIMARY_GRADE_SPECS,
  type PrimaryGradeId,
} from '../lib/primaryGradeSpecs';

const WORD_GAMES = ['scramble', 'word_match'] as const;
const EXERCISE_GAMES = [
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
] as const;

function vocabImagePath(grade: PrimaryGradeId, unit: number, word: string): string {
  if (grade === 2) return lop2VocabImagePath(unit, word);
  if (grade === 3) return lop3VocabImagePath(unit, word);
  if (grade === 4) return lop4VocabImagePath(unit, word);
  return lop5VocabImagePath(unit, word);
}

async function assertPublicImage(publicPath: string): Promise<string> {
  const diskPath = resolve(process.cwd(), 'public', publicPath.replace(/^\//, ''));
  await access(diskPath, constants.F_OK);
  return publicPath;
}

async function assignUnit(grade: PrimaryGradeId, unit: number) {
  const spec = PRIMARY_GRADE_SPECS[grade];
  const course = await findCourseByUnit(prisma, spec.levelName, unit);
  if (!course) {
    console.warn(`Skip: no ${spec.levelName} Unit ${unit}`);
    return { unit, updated: 0, images: 0 };
  }

  const vocab = spec.getVocab(unit);
  const images: string[] = [];
  const byWord: Record<string, string> = {};
  for (const item of vocab.words) {
    const publicPath = vocabImagePath(grade, unit, item.word);
    images.push(await assertPublicImage(publicPath));
    byWord[item.word.toLowerCase()] = publicPath;
    byWord[slugifyWord(item.word)] = publicPath;
  }

  let updated = 0;

  for (const game of WORD_GAMES) {
    const rows = await prisma.question.findMany({
      where: { courseId: course.id, game, active: true, archivedAt: null },
    });
    for (const row of rows) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const word = String(payload.word || '').trim();
      if (!word) continue;
      const image = byWord[word.toLowerCase()] || byWord[slugifyWord(word)];
      if (!image || payload.image === image) continue;
      await prisma.question.update({
        where: { id: row.id },
        data: { payload: { ...payload, image } as Prisma.InputJsonValue },
      });
      updated += 1;
    }
  }

  for (const game of EXERCISE_GAMES) {
    const rows = await prisma.question.findMany({
      where: { courseId: course.id, game, active: true, archivedAt: null },
    });
    for (const row of rows) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const items = Array.isArray(payload.items) ? [...payload.items] : [];
      if (items.length === 0) continue;
      let changed = false;
      const nextItems = items.map((raw, index) => {
        const item = (raw && typeof raw === 'object' ? { ...(raw as object) } : {}) as Record<
          string,
          unknown
        >;
        const answer = String(item.answer || item.word || '').trim();
        let image =
          (answer && (byWord[answer.toLowerCase()] || byWord[slugifyWord(answer)])) || '';
        if (!image && vocab.words[index]) {
          image = images[index]!;
        }
        if (!image || item.image === image) return item;
        changed = true;
        return { ...item, image };
      });
      if (!changed) continue;
      await prisma.question.update({
        where: { id: row.id },
        data: {
          payload: { ...payload, items: nextItems } as Prisma.InputJsonValue,
        },
      });
      updated += 1;
    }
  }

  console.log(
    `${spec.levelName} Unit ${String(unit).padStart(2, '0')}: ${updated} question(s) · ${images.length} images`,
  );
  return { unit, updated, images: images.length };
}

async function assignGrade(grade: PrimaryGradeId) {
  const spec = PRIMARY_GRADE_SPECS[grade];
  let updated = 0;
  let images = 0;
  for (let unit = 1; unit <= spec.unitCount; unit += 1) {
    const result = await assignUnit(grade, unit);
    updated += result.updated;
    images += result.images;
  }
  console.log(`\n${spec.levelName}: ${images} images checked, ${updated} question payload(s) updated.`);
  return { grade, updated, images };
}

async function main() {
  const grades = parsePrimaryGradeArg(process.argv.slice(2));
  const totals = { updated: 0, images: 0 };
  for (const grade of grades) {
    const result = await assignGrade(grade);
    totals.updated += result.updated;
    totals.images += result.images;
  }
  console.log(`\nDone: ${totals.images} images, ${totals.updated} question payload(s) updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
