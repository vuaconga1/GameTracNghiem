/**
 * In-place content fixes for Lớp 9 Unit 1 quiz (keep question IDs).
 *
 * A. Garbage-collector cloze: wrong answer keys + missing space before "(8) the"
 * B. Typo "theừ wedding" → "their wedding"
 * C. Find-the-mistake underline/options mismatch (neighbour / different)
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/fix-lop9-unit1-quiz-content.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { findLop9CourseByUnit, LOP9_LEVEL, parseLop9UnitNumber } from '../lib/lop9Units';

const CLOZE_MARKER = 'A local garbage collector is an important community';
const SPACE_FROM = '(8)the natural beauty';
const SPACE_TO = '(8) the natural beauty';

const WEDDING_FROM = 'theừ wedding';
const WEDDING_TO = 'their wedding';

const MISTAKE_QUESTION =
  '<u class="quiz-error-opt">There</u> is a community center <u class="quiz-error-opt">in</u> our <u class="quiz-error-opt">neighbour</u> that offers <u class="quiz-error-opt">different</u> classes and activities for all ages.';

type ClozeFix = {
  answer: string;
  accept: string[];
  options: [string, string, string, string];
};

/** Blanks 4–6 keep existing keys; only 1, 2, 3, 7, 8 change. */
const CLOZE_FIXES: Record<number, ClozeFix> = {
  1: {
    answer: 'helper',
    accept: ['helper', 'B', 'b'],
    options: ['neighbor', 'helper', 'tourist', 'adult'],
  },
  2: {
    answer: 'environment',
    accept: ['environment', 'A', 'a'],
    options: ['environment', 'relationship', 'production', 'facility'],
  },
  3: {
    answer: 'collecting',
    accept: ['collecting', 'A', 'a'],
    options: ['collecting', 'collected', 'to collect', 'collect'],
  },
  7: {
    answer: 'physically',
    accept: ['physically', 'B', 'b'],
    options: ['physics', 'physically', 'physic', 'physical'],
  },
  8: {
    answer: 'preserving',
    accept: ['preserving', 'D', 'd'],
    options: ['preventing', 'creating', 'destroying', 'preserving'],
  },
};

type QuizPayload = {
  question: string;
  answer: string;
  options: string[];
  accept: string[];
  [key: string]: unknown;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item));
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

function asPayload(value: unknown): QuizPayload | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.question !== 'string') return null;
  return {
    ...rec,
    question: rec.question,
    answer: asString(rec.answer),
    options: asStringList(rec.options),
    accept: asStringList(rec.accept),
  };
}

function clozeBlankNumber(question: string): number | null {
  const match = /Chọn đáp án đúng cho chỗ trống \((\d+)\)/.exec(question);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function optionsMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((item, i) => item === expected[i]);
}

function isGarbageCollectorCloze(payload: QuizPayload): boolean {
  return payload.question.includes(CLOZE_MARKER);
}

function isWeddingTypo(payload: QuizPayload): boolean {
  return payload.question.includes(WEDDING_FROM);
}

function isCommunityCenterMistake(payload: QuizPayload): boolean {
  const q = payload.question;
  if (!/is a community center/i.test(q)) return false;
  if (!/<u class="quiz-error-opt">There<\/u>/i.test(q)) return false;
  const opts = payload.options.map((o) => o.toLowerCase());
  const hasOldOpts = opts.includes('neighbor') && opts.includes('diffirent');
  const hasNewOpts = opts.includes('neighbour') && opts.includes('different');
  const missingUnderlines =
    /our neighbour that offers different classes/i.test(q) &&
    !/<u class="quiz-error-opt">neighbour<\/u>/i.test(q);
  return hasOldOpts || hasNewOpts || missingUnderlines;
}

function applyClozeFix(payload: QuizPayload): { next: QuizPayload; changed: boolean; detail: string } {
  const blank = clozeBlankNumber(payload.question);
  const question = payload.question.includes(SPACE_FROM)
    ? payload.question.split(SPACE_FROM).join(SPACE_TO)
    : payload.question;

  const fix = blank != null ? CLOZE_FIXES[blank] : undefined;
  if (fix && !optionsMatch(payload.options, fix.options)) {
    return {
      next: payload,
      changed: false,
      detail: `blank (${blank}) options mismatch — skipped (not the same cloze)`,
    };
  }

  const answer = fix ? fix.answer : payload.answer;
  const accept = fix ? fix.accept : payload.accept;
  const changed =
    question !== payload.question || answer !== payload.answer || !sameList(accept, payload.accept);

  return {
    next: { ...payload, question, answer, accept },
    changed,
    detail: blank == null
      ? 'space-only / unknown blank'
      : `blank (${blank}) ${payload.answer} → ${answer}`,
  };
}

function applyWeddingFix(payload: QuizPayload): { next: QuizPayload; changed: boolean; detail: string } {
  const question = payload.question.split(WEDDING_FROM).join(WEDDING_TO);
  return {
    next: { ...payload, question },
    changed: question !== payload.question,
    detail: 'theừ wedding → their wedding',
  };
}

function applyMistakeFix(payload: QuizPayload): { next: QuizPayload; changed: boolean; detail: string } {
  const next: QuizPayload = {
    ...payload,
    question: MISTAKE_QUESTION,
    options: ['There', 'in', 'neighbour', 'different'],
    answer: 'neighbour',
    accept: ['neighbour', 'C', 'c'],
  };
  const changed =
    next.question !== payload.question ||
    next.answer !== payload.answer ||
    !sameList(next.options, payload.options) ||
    !sameList(next.accept, payload.accept);
  return { next, changed, detail: 'neighbour underline + options/answer' };
}

type QuestionRow = {
  id: string;
  courseId: string;
  payload: Prisma.JsonValue;
  course: { id: string; name: string; levelName: string };
};

async function patchRow(
  row: QuestionRow,
  kind: string,
  applied: { next: QuizPayload; changed: boolean; detail: string },
  stats: { updated: number; unchanged: number },
) {
  const label = `${row.course.levelName} ${row.course.name} [${row.id}] ${kind}: ${applied.detail}`;
  if (!applied.changed) {
    stats.unchanged += 1;
    console.log(`  = ${label} (already correct)`);
    return;
  }
  await prisma.question.update({
    where: { id: row.id },
    data: { payload: applied.next as Prisma.InputJsonValue },
  });
  stats.updated += 1;
  console.log(`  * ${label}`);
}

async function main() {
  const stats = { updated: 0, unchanged: 0, scanned: 0 };

  const unit1 = await findLop9CourseByUnit(prisma, 1);
  if (!unit1) {
    throw new Error(`Missing ${LOP9_LEVEL} course named like "Unit 1: Local Environment"`);
  }
  console.log(`Unit 1 course: ${unit1.name} (${unit1.id})\n`);

  const unit1Questions = await prisma.question.findMany({
    where: {
      courseId: unit1.id,
      game: 'quiz',
      active: true,
      archivedAt: null,
    },
    select: {
      id: true,
      courseId: true,
      payload: true,
      course: { select: { id: true, name: true, levelName: true } },
    },
  });

  const otherCloze = await prisma.question.findMany({
    where: {
      game: 'quiz',
      active: true,
      archivedAt: null,
      courseId: { not: unit1.id },
      course: { levelName: LOP9_LEVEL, archivedAt: null },
    },
    select: {
      id: true,
      courseId: true,
      payload: true,
      course: { select: { id: true, name: true, levelName: true } },
    },
  });

  stats.scanned = unit1Questions.length;

  console.log('--- B. Wedding typo ---');
  for (const row of unit1Questions) {
    const payload = asPayload(row.payload);
    if (!payload || !isWeddingTypo(payload)) continue;
    await patchRow(row, 'wedding', applyWeddingFix(payload), stats);
  }

  console.log('\n--- C. Find-the-mistake community center ---');
  for (const row of unit1Questions) {
    const payload = asPayload(row.payload);
    if (!payload || !isCommunityCenterMistake(payload)) continue;
    await patchRow(row, 'mistake', applyMistakeFix(payload), stats);
  }

  console.log('\n--- A. Garbage-collector cloze (Unit 1) ---');
  for (const row of unit1Questions) {
    const payload = asPayload(row.payload);
    if (!payload || !isGarbageCollectorCloze(payload)) continue;
    await patchRow(row, 'cloze', applyClozeFix(payload), stats);
  }

  const extraCloze = otherCloze.filter((row) => {
    const payload = asPayload(row.payload);
    return payload != null && isGarbageCollectorCloze(payload);
  });
  if (extraCloze.length > 0) {
    console.log('\n--- A. Same cloze found on other Lớp 9 units ---');
    for (const row of extraCloze) {
      const payload = asPayload(row.payload);
      if (!payload) continue;
      await patchRow(row, 'cloze', applyClozeFix(payload), stats);
    }
  } else {
    console.log('\nNo matching garbage-collector cloze on other Lớp 9 units.');
  }

  console.log('\n=== Verify ===');
  const verifyIds = [...unit1Questions, ...extraCloze].map((row) => row.id);
  const verified = await prisma.question.findMany({
    where: { id: { in: verifyIds } },
    select: { id: true, payload: true, course: { select: { name: true } } },
  });

  let leftoverIssues = 0;
  for (const row of verified) {
    const payload = asPayload(row.payload);
    if (!payload) continue;

    if (payload.question.includes(WEDDING_FROM)) {
      leftoverIssues += 1;
      console.log(`  ! leftover typo: ${row.id}`);
    }
    if (payload.question.includes(SPACE_FROM)) {
      leftoverIssues += 1;
      console.log(`  ! leftover missing space (8): ${row.id}`);
    }

    if (isWeddingTypo(payload) === false && payload.question.includes('invite to their wedding')) {
      console.log(`  ok wedding: "${payload.question}" → ${payload.answer}`);
    }

    if (isCommunityCenterMistake(payload) || payload.question.includes('community center')) {
      const opts = payload.options.join(' | ');
      if (payload.question.includes('community center') && /quiz-error-opt">There</.test(payload.question)) {
        console.log(
          `  ok mistake: answer=${payload.answer} accept=${JSON.stringify(payload.accept)} options=[${opts}]`,
        );
        console.log(`     q=${payload.question}`);
      }
    }

    if (isGarbageCollectorCloze(payload)) {
      const blank = clozeBlankNumber(payload.question);
      const fix = blank != null ? CLOZE_FIXES[blank] : undefined;
      if (fix) {
        const ok = payload.answer === fix.answer && sameList(payload.accept, fix.accept);
        console.log(
          `  ${ok ? 'ok' : '!'} cloze (${blank}): answer=${payload.answer} accept=${JSON.stringify(payload.accept)}`,
        );
        if (!ok) leftoverIssues += 1;
      } else if (blank === 4 || blank === 5 || blank === 6) {
        console.log(`  ok cloze (${blank}) unchanged: ${payload.answer}`);
      }
    }
  }

  const unitNum = parseLop9UnitNumber(unit1.name);
  console.log(
    `\nDone. scanned=${stats.scanned} updated=${stats.updated} unchanged=${stats.unchanged} leftover=${leftoverIssues} unit=${unitNum}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
