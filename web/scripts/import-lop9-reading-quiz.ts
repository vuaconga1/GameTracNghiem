/**
 * Import Reading MC for Lớp 9 into skill Đọc (quiz).
 *
 * Content: scripts/data/lop9-reading-content.json
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop9-reading-quiz.ts --unit 1
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import { ensureLop9Course, LOP9_LEVEL } from '../lib/lop9Units';
import {
  compactSkillAssignment,
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
  skillsForGame,
  type GameSkillsMap,
} from '../lib/skillCatalog';

const EXTERNAL_PREFIX = 'GS9-READ';
const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop9-reading-content.json');

const READING_ONLY_GAMES = [
  'read_and_complete',
  'read_and_match',
  'vocabulary_check',
  'word_match',
  'vocabulary_test',
] as const;

type QuizItem = {
  game: 'quiz';
  type: 'multiple_choice' | 'fill_blank' | 'word_form';
  exercise: string;
  question: string;
  answer: string;
  options: string[];
  accept: string[];
  fillMode: boolean;
  typeLabel: string;
  skill: 'reading';
};

type ContentFile = {
  units: Record<string, QuizItem[]>;
  skipped?: Array<{ unit: number; reason: string; item: string }>;
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function parseUnitArg(): number | null {
  const idx = process.argv.indexOf('--unit');
  if (idx < 0) return null;
  const n = Number(process.argv[idx + 1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function ensureReadingSkills(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map: GameSkillsMap = normalizeGameSkillsMap(course.gameSkills);
  const quizSkills = skillsForGame(map.quiz);
  const nextQuiz = quizSkills.includes('reading')
    ? quizSkills
    : [...quizSkills, 'reading' as const];
  map.quiz = compactSkillAssignment(nextQuiz, true);

  for (const key of READING_ONLY_GAMES) {
    map[key] = null;
  }

  // Keep choose_and_circle on reading (Lớp 9 circle-correct-form lessons).
  map.choose_and_circle = 'reading';

  const enabledSet = new Set(resolveEnabledSkillIds(course.enabledSkills));
  enabledSet.add('reading');
  const enabledSkills = SKILL_IDS.filter((id) => enabledSet.has(id));
  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, course.enabledGames);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      gameSkills: map as Prisma.InputJsonValue,
      enabledSkills,
      enabledGames,
    },
  });
}

async function importUnit(unit: number, items: QuizItem[]) {
  const course = await ensureLop9Course(prisma, unit);
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: 'quiz',
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });
  await ensureReadingSkills(course.id);

  const maxQuiz = await prisma.question.aggregate({
    where: { courseId: course.id, game: 'quiz', archivedAt: null },
    _max: { sortOrder: true },
  });
  let sortQuiz = maxQuiz._max.sortOrder ?? 0;
  const byExercise: Record<string, number> = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    sortQuiz += 1;
    const seq = String(i + 1).padStart(3, '0');
    const payload = parseGamePayload('quiz', {
      type: item.type,
      typeLabel: item.typeLabel,
      skill: 'reading',
      exercise: item.exercise,
      question: item.question,
      answer: item.answer,
      options: item.options ?? [],
      accept: item.accept?.length ? item.accept : [item.answer],
      fillMode: item.fillMode ?? item.type !== 'multiple_choice',
    });
    await prisma.question.create({
      data: {
        courseId: course.id,
        game: 'quiz',
        active: true,
        sortOrder: sortQuiz,
        externalId: `${prefix}QZ-${item.type.slice(0, 2).toUpperCase()}-${seq}-${slugify(item.exercise)}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    byExercise[item.exercise] = (byExercise[item.exercise] || 0) + 1;
  }

  console.log(`${LOP9_LEVEL} Unit ${unit} (${course.name}): quiz=${items.length}`);
  for (const [title, n] of Object.entries(byExercise)) {
    console.log(`  · ${title}: ${n}`);
  }
  return items.length;
}

async function main() {
  const content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as ContentFile;
  const only = parseUnitArg();
  const units = Object.keys(content.units)
    .map(Number)
    .filter((u) => (only == null ? true : u === only))
    .sort((a, b) => a - b);

  let grand = 0;
  console.log('=== Import Reading → quiz (skill=reading) ===\n');
  for (const unit of units) {
    grand += await importUnit(unit, content.units[String(unit)] ?? []);
  }
  console.log(`\nTOTAL imported: ${grand}`);
  const skipped = (content.skipped ?? []).filter((s) => only == null || s.unit === only);
  console.log(`Skipped groups: ${skipped.length}`);
  for (const s of skipped) {
    console.log(`  [U${s.unit}] ${s.reason}: ${s.item}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
