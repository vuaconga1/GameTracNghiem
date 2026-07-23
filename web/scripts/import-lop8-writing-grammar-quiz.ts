/**
 * Import high-fit Writing exercises from Writing_Lop8.docx into skill Viết
 * (grammar + quiz + choose_and_circle) for Lớp 8 Unit 1–6.
 *
 * Content: scripts/data/lop8-writing-content.json
 * Regenerated via: scripts/data/_gen_lop8_writing_content.py
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-writing-grammar-quiz.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop8-writing-grammar-quiz.ts
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
} from '../lib/skillCatalog';

const EXTERNAL_PREFIX = 'GS8-WRITE';
const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop8-writing-content.json');

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

function loadContent(): ContentFile {
  return JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as ContentFile;
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

async function archivePriorImports(courseId: string, unit: number) {
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;
  await prisma.question.updateMany({
    where: {
      courseId,
      game: { in: ['grammar', 'quiz', 'choose_and_circle'] },
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });
}

async function ensureWritingSkills(courseId: string, unit: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.grammar = 'writing';

  // Merge writing into quiz multi-skill array; keep vocabulary / others.
  const quizSkills = skillsForGame(map.quiz);
  const nextQuiz = quizSkills.includes('writing')
    ? quizSkills
    : [...quizSkills, 'writing' as const];
  map.quiz = compactSkillAssignment(nextQuiz, true);

  // choose_and_circle: keep existing skills (e.g. reading leisure) and add writing.
  const circleSkills = skillsForGame(map.choose_and_circle);
  const nextCircle = new Set(circleSkills);
  nextCircle.add('writing');

  // If the course already has non-writing choose_and_circle content, keep reading.
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;
  const otherCircleCount = await prisma.question.count({
    where: {
      courseId,
      game: 'choose_and_circle',
      active: true,
      archivedAt: null,
      NOT: { externalId: { startsWith: prefix } },
    },
  });
  if (otherCircleCount > 0) nextCircle.add('reading');

  map.choose_and_circle = compactSkillAssignment(
    SKILL_IDS.filter((id) => nextCircle.has(id)),
    true
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
}

async function importUnit(unit: number, items: ContentItem[]): Promise<UnitCounts> {
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    throw new Error(`Không tìm thấy khóa ${LOP8_LEVEL} / Unit ${unit}`);
  }

  await archivePriorImports(course.id, unit);
  await ensureWritingSkills(course.id, unit);

  const counts = emptyCounts();
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;
  let sortGrammar = 0;
  let sortQuiz = 0;
  let sortCircle = 0;

  // Keep sortOrder contiguous per game among this import batch.
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
  sortGrammar = maxGrammar._max.sortOrder ?? 0;
  sortQuiz = maxQuiz._max.sortOrder ?? 0;
  sortCircle = maxCircle._max.sortOrder ?? 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
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
      const externalId = `${prefix}GR-${seq}-${slugify(item.prefix || item.source || 'g')}`;
      await prisma.question.create({
        data: {
          courseId: course.id,
          game: 'grammar',
          active: true,
          sortOrder: sortGrammar,
          externalId,
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
      const externalId = `${prefix}CC-${seq}-${slugify(item.title)}`;
      await prisma.question.create({
        data: {
          courseId: course.id,
          game: 'choose_and_circle',
          active: true,
          sortOrder: sortCircle,
          externalId,
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
    counts[item.type] += 1;
  }

  console.log(
    `${LOP8_LEVEL} Unit ${unit} (${course.name}): grammar=${counts.grammar} cc=${counts.choose_and_circle} (items=${counts.choose_and_circle_items}) mc=${counts.multiple_choice} fill=${counts.fill_blank} word_form=${counts.word_form}`,
  );
  return counts;
}

async function main() {
  const content = loadContent();
  const units = Object.keys(content.units)
    .map(Number)
    .sort((a, b) => a - b);

  const totals = emptyCounts();
  const perUnit: Record<number, UnitCounts> = {};

  for (const unit of units) {
    const counts = await importUnit(unit, content.units[String(unit)] ?? []);
    perUnit[unit] = counts;
    totals.grammar += counts.grammar;
    totals.choose_and_circle += counts.choose_and_circle;
    totals.choose_and_circle_items += counts.choose_and_circle_items;
    totals.multiple_choice += counts.multiple_choice;
    totals.fill_blank += counts.fill_blank;
    totals.word_form += counts.word_form;
  }

  console.log('\n=== Import summary ===');
  for (const unit of units) {
    const c = perUnit[unit];
    console.log(
      `Unit ${unit}: grammar=${c.grammar} | choose_and_circle=${c.choose_and_circle} (items=${c.choose_and_circle_items}) | quiz MC=${c.multiple_choice} fill=${c.fill_blank} word_form=${c.word_form}`,
    );
  }
  console.log(
    `TOTAL: grammar=${totals.grammar} | choose_and_circle=${totals.choose_and_circle} (items=${totals.choose_and_circle_items}) | quiz MC=${totals.multiple_choice} fill=${totals.fill_blank} word_form=${totals.word_form}`,
  );
  console.log(`Skipped exercise groups: ${content.skipped.length}`);
  for (const s of content.skipped) {
    console.log(`  [U${s.unit}] ${s.reason}: ${s.item}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
