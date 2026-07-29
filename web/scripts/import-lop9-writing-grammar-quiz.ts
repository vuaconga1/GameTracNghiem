/**
 * Import Writing high-fit exercises for Lớp 9
 * (grammar + quiz + choose_and_circle) → skill Viết.
 *
 * Content: scripts/data/lop9-writing-content.json
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop9-writing-grammar-quiz.ts --unit 1
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
} from '../lib/skillCatalog';

const EXTERNAL_PREFIX = 'GS9-WRITE';
const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop9-writing-content.json');

type GrammarItem = {
  game: 'grammar';
  source: string;
  prefix: string;
  suffix?: string;
  hint?: string;
  answers: string[];
};

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
  skill: 'writing';
};

type ChooseAndCircleItem = {
  game: 'choose_and_circle';
  title: string;
  instruction?: string;
  items: Array<{
    order: number;
    image?: string;
    prompt?: string;
    options: string[];
    answer: string;
  }>;
};

type ContentItem = GrammarItem | QuizItem | ChooseAndCircleItem;

type ContentFile = {
  units: Record<string, ContentItem[]>;
  skipped: Array<{ unit: number; reason: string; item: string }>;
};

type UnitCounts = {
  grammar: number;
  choose_and_circle: number;
  choose_and_circle_items: number;
  multiple_choice: number;
  fill_blank: number;
  word_form: number;
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

function emptyCounts(): UnitCounts {
  return {
    grammar: 0,
    choose_and_circle: 0,
    choose_and_circle_items: 0,
    multiple_choice: 0,
    fill_blank: 0,
    word_form: 0,
  };
}

async function ensureWritingSkills(courseId: string, unit: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.grammar = 'writing';

  const quizSkills = skillsForGame(map.quiz);
  const nextQuiz = quizSkills.includes('writing')
    ? quizSkills
    : [...quizSkills, 'writing' as const];
  map.quiz = compactSkillAssignment(nextQuiz, true);

  const circleSkills = new Set(skillsForGame(map.choose_and_circle));
  circleSkills.add('writing');
  map.choose_and_circle = compactSkillAssignment(
    SKILL_IDS.filter((id) => circleSkills.has(id)),
    true,
  );

  const enabledSet = new Set(resolveEnabledSkillIds(course.enabledSkills));
  enabledSet.add('writing');
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
  void unit;
}

async function importUnit(unit: number, items: ContentItem[]): Promise<UnitCounts> {
  const course = await ensureLop9Course(prisma, unit);
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: { in: ['grammar', 'quiz', 'choose_and_circle'] },
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });
  await ensureWritingSkills(course.id, unit);

  const counts = emptyCounts();
  const maxGrammar = await prisma.question.aggregate({
    where: { courseId: course.id, game: 'grammar', archivedAt: null },
    _max: { sortOrder: true },
  });
  const maxQuiz = await prisma.question.aggregate({
    where: { courseId: course.id, game: 'quiz', archivedAt: null },
    _max: { sortOrder: true },
  });
  const maxCircle = await prisma.question.aggregate({
    where: { courseId: course.id, game: 'choose_and_circle', archivedAt: null },
    _max: { sortOrder: true },
  });
  let sortGrammar = maxGrammar._max.sortOrder ?? 0;
  let sortQuiz = maxQuiz._max.sortOrder ?? 0;
  let sortCircle = maxCircle._max.sortOrder ?? 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const seq = String(i + 1).padStart(3, '0');

    if (item.game === 'grammar') {
      sortGrammar += 1;
      const payload = parseGamePayload('grammar', {
        source: item.source,
        prefix: item.prefix,
        suffix: item.suffix ?? '',
        hint: item.hint ?? '',
        answers: item.answers,
      });
      await prisma.question.create({
        data: {
          courseId: course.id,
          game: 'grammar',
          active: true,
          sortOrder: sortGrammar,
          externalId: `${prefix}GR-${seq}-${slugify(item.prefix || item.source || 'g')}`,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      counts.grammar += 1;
      continue;
    }

    if (item.game === 'choose_and_circle') {
      sortCircle += 1;
      const payload = parseGamePayload('choose_and_circle', {
        title: item.title,
        instruction: item.instruction ?? 'Circle the correct option in brackets.',
        items: item.items.map((row, index) => ({
          order: row.order || index + 1,
          image: row.image ?? '',
          prompt: row.prompt ?? '',
          options: row.options,
          answer: row.answer,
        })),
      });
      await prisma.question.create({
        data: {
          courseId: course.id,
          game: 'choose_and_circle',
          active: true,
          sortOrder: sortCircle,
          externalId: `${prefix}CC-${seq}-${slugify(item.title)}`,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      counts.choose_and_circle += 1;
      counts.choose_and_circle_items += item.items.length;
      continue;
    }

    sortQuiz += 1;
    const payload = parseGamePayload('quiz', {
      type: item.type,
      typeLabel: item.typeLabel,
      skill: 'writing',
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
    counts[item.type] += 1;
  }

  console.log(
    `${LOP9_LEVEL} Unit ${unit} (${course.name}): grammar=${counts.grammar} cc=${counts.choose_and_circle} (items=${counts.choose_and_circle_items}) mc=${counts.multiple_choice} fill=${counts.fill_blank} word_form=${counts.word_form}`,
  );
  return counts;
}

async function main() {
  const content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as ContentFile;
  const only = parseUnitArg();
  const units = Object.keys(content.units)
    .map(Number)
    .filter((u) => (only == null ? true : u === only))
    .sort((a, b) => a - b);

  for (const unit of units) {
    await importUnit(unit, content.units[String(unit)] ?? []);
  }

  const skipped = content.skipped.filter((s) => only == null || s.unit === only);
  console.log(`\nSkipped exercise groups: ${skipped.length}`);
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
