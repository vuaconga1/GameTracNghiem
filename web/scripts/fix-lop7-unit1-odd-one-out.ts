/**
 * Grade 7 Unit 1 Reading — Odd one out underlines and answer keys.
 *
 * The HK1 PDF lost underline strokes on these items. Letters follow the
 * /ə/ vs /ɜː/ chart on the previous page. Apply the JSON in place on Neon.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/fix-lop7-unit1-odd-one-out.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';

const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop7-unit1-content.json');

type QuizLike = {
  question: string;
  answer: string;
  options?: string[];
  accept?: string[];
  typeLabel?: string;
  exercise?: string;
};

function norm(value: string): string {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function wordKey(options: string[] | undefined): string {
  return (options || [])
    .map((option) => norm(option))
    .filter(Boolean)
    .sort()
    .join('|');
}

function isGrade7(levelName: string, courseName: string): boolean {
  const blob = `${levelName} ${courseName}`.toLowerCase();
  return blob.includes('lớp 7') || blob.includes('lop 7') || blob.includes('grade 7');
}

async function main() {
  const data = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as { quiz?: QuizLike[] };
  const fixes = (data.quiz || []).filter(
    (item) => item.typeLabel === 'Odd one out' && (item.options || []).length > 0,
  );
  if (fixes.length !== 5) {
    throw new Error(`Expected 5 odd-one-out items in Unit 1 JSON, found ${fixes.length}`);
  }

  const byQuestion = new Map(fixes.map((item) => [norm(item.question), item]));
  const byWords = new Map(fixes.map((item) => [wordKey(item.options), item]));

  const rows = await prisma.question.findMany({
    where: { game: 'quiz', archivedAt: null },
    select: {
      id: true,
      payload: true,
      course: { select: { name: true, levelName: true } },
    },
  });

  let changed = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    const payload = row.payload as QuizLike;
    if (!payload || typeof payload.question !== 'string') continue;
    const fix =
      byQuestion.get(norm(payload.question)) ||
      byWords.get(wordKey(payload.options));
    if (!fix) continue;
    if (!isGrade7(row.course.levelName, row.course.name)) {
      console.log(`Skip non-grade-7 ${row.course.levelName} / ${row.course.name}`);
      continue;
    }

    seen.add(norm(fix.question));
    const next: QuizLike = {
      ...payload,
      options: [...(fix.options || [])],
      answer: fix.answer,
      accept: [...(fix.accept || [fix.answer])],
    };
    const same =
      JSON.stringify(payload.options || []) === JSON.stringify(next.options) &&
      payload.answer === next.answer &&
      JSON.stringify(payload.accept || []) === JSON.stringify(next.accept);
    console.log(
      [
        same ? 'unchanged' : 'update',
        row.course.levelName,
        row.course.name,
        `answer ${norm(payload.answer)} -> ${norm(next.answer)}`,
        `options ${ (next.options || []).join(' | ') }`,
      ].join(' | '),
    );
    if (same) continue;
    await prisma.question.update({
      where: { id: row.id },
      data: { payload: next as Prisma.InputJsonValue },
    });
    changed += 1;
  }

  const missing = fixes.filter((fix) => !seen.has(norm(fix.question)));
  if (missing.length) {
    console.log('Not found in Neon:');
    for (const fix of missing) console.log('  - ' + norm(fix.question));
  }
  console.log(`Updated ${changed} question payload(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
