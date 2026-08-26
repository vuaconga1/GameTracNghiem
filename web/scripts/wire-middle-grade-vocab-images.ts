/**
 * Wire a middle-grade (Lớp 7/8/9) grade's question payloads to their on-disk
 * vocab clipart.
 *
 * For every question in the grade, derive the conventional image path from the
 * question's own word/answer and set payload.image / items[].image when:
 *   - the PNG exists on disk, AND
 *   - the current value is empty or different.
 *
 * Idempotent + safe: never clears an existing image, only fills/corrects to a
 * real file. Dry-run by default; pass --apply to write.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/wire-middle-grade-vocab-images.ts --grade 7           # dry run
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/wire-middle-grade-vocab-images.ts --grade 7 --apply   # write
 */
import fs from 'node:fs';
import path from 'node:path';

import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { middleGradeVocabImagePath, type MiddleGrade } from '../lib/middleGradeVocabImages';

const APPLY = process.argv.includes('--apply');
const publicDir = path.join(process.cwd(), 'public');

const WORD_GAMES = new Set(['word_match', 'scramble']);
const ITEM_GAMES = new Set([
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
  'look_and_write',
]);

function parseGrade(): MiddleGrade {
  const idx = process.argv.indexOf('--grade');
  const raw = idx >= 0 ? Number(process.argv[idx + 1]) : NaN;
  if (raw !== 7 && raw !== 8 && raw !== 9) {
    throw new Error('Pass --grade 7 | 8 | 9');
  }
  return raw;
}

function isGrade(levelName: string | null, grade: MiddleGrade): boolean {
  return new RegExp(`Lớp\\s*${grade}(?!\\d)`, 'i').test(levelName ?? '');
}

function unitFromName(name: string | null): number | null {
  const m = (name ?? '').match(/Unit\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function fileExists(publicPath: string): boolean {
  return fs.existsSync(path.join(publicDir, publicPath.replace(/^\//, '')));
}

async function main() {
  const grade = parseGrade();
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, levelName: true },
  });
  const byId = new Map(courses.map((c) => [c.id, c]));

  const questions = await prisma.question.findMany({
    select: { id: true, courseId: true, game: true, payload: true, active: true, archivedAt: true },
  });

  let updated = 0;
  let fieldsSet = 0;
  const perUnit: Record<number, number> = {};

  for (const q of questions) {
    if (!q.active || q.archivedAt) continue;
    const c = byId.get(q.courseId);
    if (!isGrade(c?.levelName ?? null, grade)) continue;
    const unit = unitFromName(c?.name ?? null);
    if (!unit) continue;

    const payload = (q.payload ?? {}) as Record<string, unknown>;
    let changed = false;

    if (WORD_GAMES.has(q.game)) {
      const word = String(payload.word || payload.answer || '').trim();
      if (word) {
        const p = middleGradeVocabImagePath(grade, unit, word);
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
        const p = middleGradeVocabImagePath(grade, unit, word);
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
    perUnit[unit] = (perUnit[unit] ?? 0) + 1;
    if (APPLY) {
      await prisma.question.update({
        where: { id: q.id },
        data: { payload: payload as Prisma.InputJsonValue },
      });
    }
  }

  console.log(`=== Wire Lớp ${grade} vocab images (${APPLY ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`questions ${APPLY ? 'updated' : 'to update'}: ${updated}`);
  console.log(`image fields ${APPLY ? 'set' : 'to set'}: ${fieldsSet}`);
  console.log('per unit:', perUnit);
  if (!APPLY) console.log('\n(dry run — re-run with --apply to write)');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
