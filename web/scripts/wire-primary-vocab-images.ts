/**
 * Wire primary (Lớp 1-5) question payloads to their on-disk vocab clipart.
 *
 * For every primary-grade question, derive the conventional image path from the
 * question's own word/answer (NOT the canonical flashcard list, which can differ
 * from the game content) and set payload.image / items[].image when:
 *   - the PNG exists on disk, AND
 *   - the current value is empty or different.
 *
 * Idempotent + safe: never clears an existing image, only fills/corrects to a
 * real file. Dry-run by default; pass --apply to write.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/wire-primary-vocab-images.ts            # dry run
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/wire-primary-vocab-images.ts --apply    # write
 */
import fs from 'node:fs';
import path from 'node:path';

import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { lop1VocabImagePath } from '../lib/lop1VocabImages';
import { lop2VocabImagePath } from '../lib/lop2VocabImages';
import { lop3VocabImagePath } from '../lib/lop3VocabImages';
import { lop4VocabImagePath } from '../lib/lop4VocabImages';
import { lop5VocabImagePath } from '../lib/lop5VocabImages';

const APPLY = process.argv.includes('--apply');
const publicDir = path.join(process.cwd(), 'public');

const PATH_FOR: Record<number, (unit: number, word: string) => string> = {
  1: lop1VocabImagePath,
  2: lop2VocabImagePath,
  3: lop3VocabImagePath,
  4: lop4VocabImagePath,
  5: lop5VocabImagePath,
};

const WORD_GAMES = new Set(['word_match', 'scramble']);
const ITEM_GAMES = new Set([
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
  'look_and_write',
]);

function gradeFromLevel(levelName: string | null): number | null {
  const m = (levelName ?? '').match(/Lớp\s*(\d+)/i);
  if (!m) return null;
  const g = Number(m[1]);
  return g >= 1 && g <= 5 ? g : null;
}

function unitFromName(name: string | null): number | null {
  const m = (name ?? '').match(/Unit\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function fileExists(publicPath: string): boolean {
  return fs.existsSync(path.join(publicDir, publicPath.replace(/^\//, '')));
}

async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, levelName: true },
  });
  const byId = new Map(courses.map((c) => [c.id, c]));

  const questions = await prisma.question.findMany({
    select: { id: true, courseId: true, game: true, payload: true, active: true, archivedAt: true },
  });

  let updated = 0;
  let fieldsSet = 0;
  const perGrade: Record<number, number> = {};

  for (const q of questions) {
    if (!q.active || q.archivedAt) continue;
    const c = byId.get(q.courseId);
    const grade = gradeFromLevel(c?.levelName ?? null);
    if (!grade) continue;
    const unit = unitFromName(c?.name ?? null);
    if (!unit) continue;
    const pathFor = PATH_FOR[grade];

    const payload = (q.payload ?? {}) as Record<string, unknown>;
    let changed = false;

    if (WORD_GAMES.has(q.game)) {
      const word = String(payload.word || '').trim();
      if (word) {
        const p = pathFor(unit, word);
        if (fileExists(p) && payload.image !== p) {
          payload.image = p;
          changed = true;
          fieldsSet += 1;
        }
      }
    } else if (ITEM_GAMES.has(q.game) && Array.isArray(payload.items)) {
      const items = payload.items.map((raw) => {
        const item = (raw && typeof raw === 'object' ? { ...(raw as object) } : {}) as Record<
          string,
          unknown
        >;
        const word = String(item.answer || item.word || '').trim();
        if (!word) return item;
        const p = pathFor(unit, word);
        if (fileExists(p) && item.image !== p) {
          item.image = p;
          changed = true;
          fieldsSet += 1;
        }
        return item;
      });
      if (changed) payload.items = items;
    }

    if (!changed) continue;
    updated += 1;
    perGrade[grade] = (perGrade[grade] ?? 0) + 1;
    if (APPLY) {
      await prisma.question.update({
        where: { id: q.id },
        data: { payload: payload as Prisma.InputJsonValue },
      });
    }
  }

  console.log(`=== Wire primary vocab images (${APPLY ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`questions ${APPLY ? 'updated' : 'to update'}: ${updated}`);
  console.log(`image fields ${APPLY ? 'set' : 'to set'}: ${fieldsSet}`);
  console.log('per grade:', perGrade);
  if (!APPLY) console.log('\n(dry run — re-run with --apply to write)');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
