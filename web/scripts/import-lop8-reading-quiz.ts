/**
 * Import Language/Phonetics MC from Reading_Lop8.docx into skill Đọc (reading)
 * as quiz questions for Lớp 8 Unit 1–6.
 *
 * Content: scripts/data/lop8-reading-content.json
 * Regenerated via: node scripts/data/_gen_lop8_reading_content.mjs
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-reading-quiz.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import { findLop8CourseByUnit, LOP8_LEVEL } from '../lib/lop8Units';
import {
  compactSkillAssignment,
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
  skillsForGame,
  type GameSkillsMap,
  type SkillId,
} from '../lib/skillCatalog';

const EXTERNAL_PREFIX = 'GS8-READ';
const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop8-reading-content.json');

/** Reading-default games that should stay hidden until they have content. */
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
  uncertain?: Array<{ unit: number; exercise: string; reason: string; question?: string }>;
  titles?: Record<string, Record<string, number>>;
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

function loadContent(): ContentFile {
  return JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as ContentFile;
}

function wordCount(s: string): number {
  return String(s || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

async function archivePriorImports(courseId: string, unit: number) {
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;
  await prisma.question.updateMany({
    where: {
      courseId,
      game: 'quiz',
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });
}

/**
 * Merge reading into quiz; hide empty reading-only games; strip reading from
 * choose_and_circle so Đọc only shows Trắc nghiệm for now.
 */
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
  // Keep vocabulary / writing if already present
  map.quiz = compactSkillAssignment(nextQuiz, true);

  // Hide empty reading-only starters under Đọc
  for (const key of READING_ONLY_GAMES) {
    map[key] = null;
  }

  // choose_and_circle: keep writing (and others) but drop reading for now
  const circleSkills = skillsForGame(map.choose_and_circle).filter((id) => id !== 'reading');
  map.choose_and_circle = compactSkillAssignment(circleSkills as SkillId[], true);

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
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    throw new Error(`Không tìm thấy khóa ${LOP8_LEVEL} / Unit ${unit}`);
  }

  await archivePriorImports(course.id, unit);
  await ensureReadingSkills(course.id);

  const maxQuiz = await prisma.question.aggregate({
    where: { courseId: course.id, game: 'quiz', archivedAt: null },
    _max: { sortOrder: true },
  });
  let sortQuiz = maxQuiz._max.sortOrder ?? 0;

  const byExercise: Record<string, number> = {};
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (wordCount(item.exercise) > 6) {
      throw new Error(`Unit ${unit}: exercise title >6 words: "${item.exercise}"`);
    }
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
    const externalId = `${prefix}QZ-${item.type.slice(0, 2).toUpperCase()}-${seq}-${slugify(item.exercise)}`;
    await prisma.question.create({
      data: {
        courseId: course.id,
        game: 'quiz',
        active: true,
        sortOrder: sortQuiz,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    byExercise[item.exercise] = (byExercise[item.exercise] || 0) + 1;
  }

  console.log(`${LOP8_LEVEL} Unit ${unit} (${course.name}): quiz=${items.length}`);
  for (const [title, n] of Object.entries(byExercise)) {
    console.log(`  · ${title}: ${n}`);
  }
  return { total: items.length, byExercise };
}

async function main() {
  const content = loadContent();
  const units = Object.keys(content.units)
    .map(Number)
    .filter((u) => u >= 1 && u <= 6)
    .sort((a, b) => a - b);

  let grand = 0;
  console.log('=== Import Reading → quiz (skill=reading) ===\n');

  for (const unit of units) {
    const items = content.units[String(unit)] ?? [];
    const result = await importUnit(unit, items);
    grand += result.total;
  }

  console.log(`\nTOTAL imported: ${grand}`);
  console.log(`Uncertain answers (content log): ${content.uncertain?.length ?? 0}`);
  console.log(`Skipped groups: ${content.skipped?.length ?? 0}`);
  if (content.skipped?.length) {
    for (const s of content.skipped) {
      console.log(`  [U${s.unit}] ${s.reason}: ${s.item}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
