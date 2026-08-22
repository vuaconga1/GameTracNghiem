import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { stripHtmlTags } from '../features/games/exerciseDisplay';

const BASE = 'https://game-trac-nghiem.vercel.app';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return String(value ?? '').trim();
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

async function main() {
  const courses = await prisma.course.findMany({
    where: {
      active: true,
      archivedAt: null,
      OR: [
        { levelName: 'Lớp 1', name: { contains: 'Unit 1' } },
        { levelName: 'Lớp 4', name: { contains: 'Unit 1' } },
        { levelName: 'Lớp 6', name: { contains: 'Unit 1' } },
        { levelName: 'Lớp 8', name: { contains: 'Unit 1' } },
        { levelName: 'Lớp 9', name: { contains: 'Unit 1' } },
      ],
    },
    select: { id: true, name: true, levelName: true },
    orderBy: { levelName: 'asc' },
  });

  const http: unknown[] = [];
  for (const course of courses) {
    for (const slug of [
      'grammar',
      'quiz',
      'pronunciation',
      'scramble',
      'word-match',
      'look-and-write',
      'choose-and-circle',
      'read-and-complete',
      'read-and-match',
      'vocabulary-test',
      'vocabulary-check',
    ]) {
      const res = await fetch(
        `${BASE}/api/games/${slug}/${encodeURIComponent(course.id)}`,
      );
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const questions = Array.isArray(json.questions) ? json.questions : [];
      const row: Record<string, unknown> = {
        level: course.levelName,
        unit: course.name,
        slug,
        status: res.status,
        count: questions.length,
      };
      if (slug === 'quiz' && questions.length) {
        const withU = questions.filter((item) =>
          /<u\b|&lt;u/i.test(asString(asRecord(item).question)),
        );
        row.underlineQuestions = withU.length;
        row.sampleUnderline = withU.slice(0, 3).map((item) =>
          asString(asRecord(item).question).slice(0, 160),
        );
        const escaped = questions.filter((item) =>
          /&lt;\s*\/?\s*u/i.test(asString(asRecord(item).question)),
        );
        row.escapedUnderline = escaped.length;
      }
      if (slug === 'grammar' && questions.length) {
        row.sample = questions.slice(0, 2).map((item) => {
          const rec = asRecord(item);
          return {
            prefix: asString(rec.prefix).slice(0, 80),
            suffix: asString(rec.suffix).slice(0, 80),
            answers: asList(rec.answers).slice(0, 3),
          };
        });
      }
      http.push(row);
    }
  }

  const quizRows = await prisma.question.findMany({
    where: { game: 'quiz', active: true, archivedAt: null },
    select: { payload: true, course: { select: { name: true, levelName: true } } },
  });
  let rawU = 0;
  let escapedU = 0;
  let answerNotInOptions = 0;
  const answerMismatch: string[] = [];
  for (const row of quizRows) {
    const payload = asRecord(row.payload);
    const q = asString(payload.question);
    if (/&lt;\s*\/?\s*u/i.test(q)) escapedU += 1;
    if (/<u\b/i.test(q)) rawU += 1;
    const type = asString(payload.type);
    if (type && type !== 'multiple_choice') continue;
    const options = asList(payload.options).map((item) =>
      stripHtmlTags(item).toLowerCase(),
    );
    const answer = stripHtmlTags(asString(payload.answer)).toLowerCase();
    if (options.length >= 2 && answer && !options.includes(answer)) {
      answerNotInOptions += 1;
      if (answerMismatch.length < 8) {
        answerMismatch.push(
          `${row.course.levelName} ${row.course.name}: ans=${asString(payload.answer)} opts=${asList(payload.options).join(' / ')}`.slice(0, 220),
        );
      }
    }
  }

  const grammarRows = await prisma.question.findMany({
    where: { game: 'grammar', active: true, archivedAt: null },
    select: { payload: true, course: { select: { name: true, levelName: true } } },
  });
  let shortPunct = 0;
  const shortPunctSamples: string[] = [];
  let curlyOnly = 0;
  const curlySamples: string[] = [];
  for (const row of grammarRows) {
    const payload = asRecord(row.payload);
    const answers = asList(payload.answers);
    const short = answers.filter((item) => item.split(/\s+/).length <= 3);
    for (const answer of short) {
      if (/[.,!?;:]$/.test(answer) && !answers.includes(answer.replace(/[.,!?;:]+$/, ''))) {
        shortPunct += 1;
        if (shortPunctSamples.length < 6) {
          shortPunctSamples.push(
            `${row.course.levelName} ${row.course.name}: ${answer}`,
          );
        }
      }
    }
    const hasStraight = answers.some((item) => /['"]/.test(item) && !/[‘’“”]/.test(item));
    const hasCurly = answers.some((item) => /[‘’“”]/.test(item));
    if (hasCurly && !hasStraight) {
      curlyOnly += 1;
      if (curlySamples.length < 6) {
        curlySamples.push(
          `${row.course.levelName} ${row.course.name}: ${answers[0]}`,
        );
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        http,
        quiz: { rawU, escapedU, answerNotInOptions, answerMismatch },
        grammar: { shortPunct, shortPunctSamples, curlyOnly, curlySamples },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
