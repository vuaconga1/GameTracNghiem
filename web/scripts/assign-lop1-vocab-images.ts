/**
 * Assign Lớp 1 vocab PNG paths into question payloads for:
 * scramble, word_match, pronunciation (unchanged text),
 * and exercise games choose_and_circle / read_and_* / vocabulary_*.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/assign-lop1-vocab-images.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/assign-lop1-vocab-images.ts
 */
import '../lib/loadEnv';

import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { findLop1CourseByUnit, LOP1_LEVEL, LOP1_UNIT_COUNT } from '../lib/lop1Units';
import { getLop1UnitVocab, slugifyLop1Word } from '../lib/lop1Vocab';
import { lop1VocabImagePath } from '../lib/lop1VocabImages';

const WORD_GAMES = ['scramble', 'word_match'] as const;
const EXERCISE_GAMES = [
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
] as const;

async function assertPublicImage(unit: number, word: string): Promise<string> {
  const publicPath = lop1VocabImagePath(unit, word);
  const diskPath = resolve(process.cwd(), 'public', publicPath.replace(/^\//, ''));
  await access(diskPath, constants.F_OK);
  return publicPath;
}

function wordImageMap(unit: number): Record<string, string> {
  const vocab = getLop1UnitVocab(unit);
  const map: Record<string, string> = {};
  for (const item of vocab.words) {
    map[item.word.toLowerCase()] = lop1VocabImagePath(unit, item.word);
    map[slugifyLop1Word(item.word)] = lop1VocabImagePath(unit, item.word);
  }
  return map;
}

async function assignUnit(unit: number) {
  const course = await findLop1CourseByUnit(prisma, unit);
  if (!course) {
    console.warn(`Skip: no ${LOP1_LEVEL} Unit ${unit}`);
    return { unit, updated: 0 };
  }

  const vocab = getLop1UnitVocab(unit);
  const images: string[] = [];
  for (const item of vocab.words) {
    images.push(await assertPublicImage(unit, item.word));
  }
  const byWord = wordImageMap(unit);

  let updated = 0;

  // Word games: match by word field
  for (const game of WORD_GAMES) {
    const rows = await prisma.question.findMany({
      where: { courseId: course.id, game, active: true, archivedAt: null },
    });
    for (const row of rows) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const word = String(payload.word || '').trim();
      if (!word) continue;
      const image = byWord[word.toLowerCase()] || byWord[slugifyLop1Word(word)];
      if (!image) continue;
      if (payload.image === image) continue;
      await prisma.question.update({
        where: { id: row.id },
        data: {
          payload: { ...payload, image } as Prisma.InputJsonValue,
        },
      });
      updated += 1;
    }
  }

  // Exercise games: map items by answer / word order
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
          (answer && (byWord[answer.toLowerCase()] || byWord[slugifyLop1Word(answer)])) || '';
        if (!image && vocab.words[index]) {
          image = images[index]!;
        }
        if (!image) return item;
        if (item.image === image) return item;
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
    `${LOP1_LEVEL} Unit ${String(unit).padStart(2, '0')}: ${updated} question(s) updated · ${images.length} images`,
  );
  return { unit, updated };
}

async function main() {
  let total = 0;
  for (let unit = 1; unit <= LOP1_UNIT_COUNT; unit += 1) {
    const result = await assignUnit(unit);
    total += result.updated;
  }
  console.log(`\nDone: ${total} question payload(s) updated with vocab images.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
