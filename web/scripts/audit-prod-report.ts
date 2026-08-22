/**
 * Production QA summary (UTF-8 file output).
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/audit-prod-report.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { GAME_CATALOG } from '../lib/gameCatalog';
import { isGameVisibleForCourse } from '../lib/skillCatalog';
import { stripHtmlTags } from '../features/games/exerciseDisplay';

const BASE = process.env.PRODUCTION_BASE_URL || 'https://game-trac-nghiem.vercel.app';
const OUT = join(__dirname, 'data', '_prod-qa-report.json');

function rec(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function str(value: unknown): string {
  return String(value ?? '').trim();
}
function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? '').trim()).filter(Boolean) : [];
}

function normalizeLoose(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

async function fetchText(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function main() {
  const courses = await prisma.course.findMany({
    where: { active: true, archivedAt: null },
    select: {
      id: true,
      name: true,
      levelName: true,
      enabledGames: true,
      gameSkills: true,
      enabledSkills: true,
    },
  });

  const questions = await prisma.question.findMany({
    where: { active: true, archivedAt: null },
    select: { id: true, game: true, courseId: true, payload: true },
  });

  const qByCourseGame = new Map<string, number>();
  for (const q of questions) {
    const key = `${q.courseId}|${q.game}`;
    qByCourseGame.set(key, (qByCourseGame.get(key) || 0) + 1);
  }

  const byLevelGame: Record<string, Record<string, number>> = {};
  for (const q of questions) {
    const course = courses.find((c) => c.id === q.courseId);
    const level = course?.levelName || '?';
    byLevelGame[level] ??= {};
    byLevelGame[level][q.game] = (byLevelGame[level][q.game] || 0) + 1;
  }

  const visibleEmpty: Array<{ level: string; unit: string; game: string }> = [];
  for (const course of courses) {
    for (const game of GAME_CATALOG) {
      const visible = isGameVisibleForCourse(
        course.gameSkills,
        course.enabledSkills,
        game.key,
        course.enabledGames,
      );
      if (!visible) continue;
      const count = qByCourseGame.get(`${course.id}|${game.key}`) || 0;
      if (count === 0) {
        visibleEmpty.push({
          level: course.levelName,
          unit: course.name,
          game: game.key,
        });
      }
    }
  }

  const emptyByGame: Record<string, number> = {};
  const emptyByLevel: Record<string, number> = {};
  for (const row of visibleEmpty) {
    emptyByGame[row.game] = (emptyByGame[row.game] || 0) + 1;
    emptyByLevel[row.level] = (emptyByLevel[row.level] || 0) + 1;
  }

  let grammarPeriodOnly = 0;
  let grammarCurlyOnly = 0;
  let grammarFillPeriod = 0;
  let grammarRewritePeriod = 0;
  const grammarFillPeriodSamples: string[] = [];
  const grammarCurlySamples: string[] = [];
  const grammarWouldPassIfLoose: string[] = [];

  for (const q of questions.filter((item) => item.game === 'grammar')) {
    const payload = rec(q.payload);
    const answers = list(payload.answers);
    const prefix = str(payload.prefix);
    const suffix = str(payload.suffix);
    const isFill = Boolean(prefix || suffix);
    const hasStraight = answers.some((item) => /['"]/.test(item) && !/[‘’“”]/.test(item));
    const hasCurly = answers.some((item) => /[‘’“”]/.test(item));
    if (hasCurly && !hasStraight) {
      grammarCurlyOnly += 1;
      if (grammarCurlySamples.length < 5) grammarCurlySamples.push(answers[0] || '');
    }
    for (const answer of answers) {
      const stripped = answer.replace(/[.,!?;:]+$/g, '');
      if (/[.,!?;:]$/.test(answer) && !answers.includes(stripped)) {
        grammarPeriodOnly += 1;
        if (isFill) {
          grammarFillPeriod += 1;
          if (grammarFillPeriodSamples.length < 8) grammarFillPeriodSamples.push(answer);
        } else {
          grammarRewritePeriod += 1;
        }
      }
    }
  }

  let quizEscapedU = 0;
  let quizRawU = 0;
  let quizMcMismatch = 0;
  let quizFillCurly = 0;
  let quizFillEmpty = 0;
  const quizMcMismatchSamples: string[] = [];
  const quizFillCurlySamples: string[] = [];

  for (const q of questions.filter((item) => item.game === 'quiz')) {
    const payload = rec(q.payload);
    const question = str(payload.question);
    if (/&lt;\s*\/?\s*u/i.test(question)) quizEscapedU += 1;
    if (/<u\b/i.test(question)) quizRawU += 1;
    const type = str(payload.type) || 'multiple_choice';
    if (type === 'multiple_choice' || type === '') {
      const options = list(payload.options).map((item) => stripHtmlTags(item).toLowerCase());
      const answer = stripHtmlTags(str(payload.answer)).toLowerCase();
      if (options.length >= 2 && answer && !options.includes(answer)) {
        quizMcMismatch += 1;
        if (quizMcMismatchSamples.length < 8) {
          quizMcMismatchSamples.push(
            `${answer} || ${list(payload.options).join(' / ')}`.slice(0, 180),
          );
        }
      }
    }
    if (type === 'fill_blank' || type === 'word_form') {
      const accept = [...list(payload.accept), str(payload.answer)].filter(Boolean);
      if (accept.length === 0) quizFillEmpty += 1;
      const blob = accept.join(' ');
      if (/[‘’“”]/.test(blob) && !accept.some((item) => /['"]/.test(item) && !/[‘’“”]/.test(item))) {
        quizFillCurly += 1;
        if (quizFillCurlySamples.length < 6) quizFillCurlySamples.push(accept[0] || '');
      }
    }
  }

  const lookRows = questions.filter((item) => item.game === 'look_and_write');
  const lookCourses = lookRows.map((item) => {
    const course = courses.find((c) => c.id === item.courseId);
    return `${course?.levelName || '?'} / ${course?.name || '?'}`;
  });

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const scoreRows = await prisma.scoreLog.groupBy({
    by: ['game'],
    where: { answeredAt: { gte: since } },
    _count: { _all: true },
  });
  const scoreCorrect = await prisma.scoreLog.groupBy({
    by: ['game'],
    where: { answeredAt: { gte: since }, isCorrect: true },
    _count: { _all: true },
  });
  const correctByGame = new Map(scoreCorrect.map((row) => [row.game, row._count._all]));
  const scores = scoreRows
    .map((row) => {
      const total = row._count._all;
      const correct = correctByGame.get(row.game) || 0;
      return {
        game: row.game,
        total,
        correct,
        wrongRate: total ? Math.round((1 - correct / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.wrongRate - a.wrongRate);

  const targets = [
    { level: 'Lớp 6', name: 'Unit 1: My New School' },
    { level: 'Lớp 8', nameContains: 'UNIT 1' },
    { level: 'Lớp 9', name: 'Unit 1: Local Environment' },
    { level: 'Lớp 1', name: 'Unit 1: In The School Playground' },
    { level: 'Lớp 4', name: 'Unit 1: My Friends' },
  ];

  const http: unknown[] = [];
  for (const target of targets) {
    const course = courses.find((c) => {
      if (c.levelName !== target.level) return false;
      if ('name' in target && target.name) return c.name === target.name;
      if ('nameContains' in target && target.nameContains) {
        return c.name.toUpperCase().includes(String(target.nameContains).toUpperCase());
      }
      return false;
    });
    if (!course) {
      http.push({ target, error: 'course not found' });
      continue;
    }
    const detail = await fetchText(`/courses/${encodeURIComponent(course.id)}`);
    http.push({
      kind: 'page',
      level: course.levelName,
      unit: course.name,
      path: `/courses/${course.id}`,
      status: detail.status,
      hasAppError: /Application error|Internal Server Error/i.test(detail.text),
    });
    for (const slug of ['grammar', 'quiz', 'pronunciation', 'scramble', 'look-and-write']) {
      const page = await fetchText(`/games/${slug}/${encodeURIComponent(course.id)}`);
      const api = await fetch(`${BASE}/api/games/${slug}/${encodeURIComponent(course.id)}`);
      const json = (await api.json().catch(() => ({}))) as Record<string, unknown>;
      const qs = Array.isArray(json.questions) ? json.questions : [];
      let escapedOnPage = false;
      if (slug === 'quiz' && page.ok) {
        escapedOnPage =
          page.text.includes('&lt;u') ||
          page.text.includes('&amp;lt;u') ||
          /&lt;u class=/.test(page.text);
      }
      http.push({
        kind: 'game',
        level: course.levelName,
        unit: course.name,
        slug,
        pageStatus: page.status,
        apiStatus: api.status,
        questionCount: qs.length,
        escapedUnderlineOnPage: escapedOnPage,
        pageHasAppError: /Application error|Internal Server Error/i.test(page.text),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    questionCounts: Object.fromEntries(
      [...questions.reduce((map, q) => map.set(q.game, (map.get(q.game) || 0) + 1), new Map<string, number>())].sort(),
    ),
    byLevelGame,
    lookAndWrite: { count: lookRows.length, courses: [...new Set(lookCourses)] },
    visibleButEmpty: {
      total: visibleEmpty.length,
      byGame: emptyByGame,
      byLevel: emptyByLevel,
      samples: visibleEmpty.slice(0, 20),
    },
    grammar: {
      periodAnswersWithoutBareVariant: grammarPeriodOnly,
      fillWithPeriod: grammarFillPeriod,
      rewriteWithPeriod: grammarRewritePeriod,
      curlyOnly: grammarCurlyOnly,
      fillPeriodSamples: grammarFillPeriodSamples,
      curlySamples: grammarCurlySamples,
      wouldPassIfLooseSamples: grammarWouldPassIfLoose,
    },
    quiz: {
      rawU: quizRawU,
      escapedU: quizEscapedU,
      mcMismatch: quizMcMismatch,
      mcMismatchSamples: quizMcMismatchSamples,
      fillEmpty: quizFillEmpty,
      fillCurlyOnly: quizFillCurly,
      fillCurlySamples: quizFillCurlySamples,
    },
    scores14d: scores,
    http,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  console.log(`wrote ${OUT}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
