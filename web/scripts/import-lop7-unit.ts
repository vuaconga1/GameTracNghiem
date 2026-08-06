/**
 * Import Global Success 7 unit content (quiz/grammar/scramble/pronunciation/read_and_complete + speaking).
 *
 * Content files: scripts/data/lop7-unit{N}-content.json
 *
 * Usage (from web/):
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop7-unit.ts --unit 2
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop7-unit.ts --all
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop7-unit.ts --unit 1 --dry-run
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  ensureLop7Course,
  LOP7_LEVEL,
  LOP7_UNIT_COUNT,
  lop7UnitCourseName,
} from '../lib/lop7Units';
import {
  compactSkillAssignment,
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';

type QuizItem = {
  type: 'multiple_choice' | 'fill_blank' | 'word_form';
  typeLabel: string;
  skill: 'listening' | 'reading' | 'speaking' | 'writing' | 'vocabulary';
  exercise: string;
  question: string;
  answer: string;
  options: string[];
  accept: string[];
  fillMode: boolean;
};

type GrammarItem = {
  source: string;
  prefix: string;
  suffix?: string;
  hint?: string;
  answers: string[];
};

type ScrambleItem = { word: string; hint?: string };
type PronunciationItem = {
  mode: 'phoneme' | 'word' | 'sentence';
  modeLabel?: string;
  exercise?: string;
  exerciseKey?: string;
  targetText: string;
  targetIpa?: string;
  hint?: string;
};

type ReadAndCompleteItem = {
  title: string;
  instruction?: string;
  word_bank: string[];
  items: Array<{ order: number; sentence: string; image?: string; answer: string }>;
};

type ChooseAndCircleItem = {
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

type ContentFile = {
  unit: number;
  title: string;
  quiz: QuizItem[];
  grammar: GrammarItem[];
  scramble: ScrambleItem[];
  pronunciation: PronunciationItem[];
  read_and_complete?: ReadAndCompleteItem[];
  choose_and_circle?: ChooseAndCircleItem[];
  speakingTopic: { title: string; durationSeconds?: number };
  skipped?: Array<{ reason: string; item: string }>;
};

function isDryRun() {
  return process.argv.includes('--dry-run');
}

function parseUnitArgs(): number[] {
  if (process.argv.includes('--all')) {
    return Array.from({ length: LOP7_UNIT_COUNT }, (_, i) => i + 1);
  }
  const idx = process.argv.indexOf('--unit');
  if (idx < 0) return [1];
  const n = Number(process.argv[idx + 1]);
  if (!Number.isInteger(n) || n < 1 || n > LOP7_UNIT_COUNT) {
    throw new Error(`Invalid --unit (1â€“${LOP7_UNIT_COUNT})`);
  }
  return [n];
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function externalPrefix(unit: number) {
  return `GS7-U${unit}-`;
}

function contentPath(unit: number) {
  return resolve(process.cwd(), `scripts/data/lop7-unit${unit}-content.json`);
}

async function ensureUnitSkills(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.grammar = 'writing';
  map.scramble = 'vocabulary';
  map.pronunciation = 'speaking';
  map.read_and_complete = 'reading';
  map.choose_and_circle = 'reading';
  map.quiz = compactSkillAssignment(['reading', 'writing'], true);

  const enabledSet = new Set(resolveEnabledSkillIds(course.enabledSkills));
  for (const skill of SKILL_IDS) enabledSet.add(skill);
  const enabledSkills = SKILL_IDS.filter((id) => enabledSet.has(id));
  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, course.enabledGames);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      gameSkills: map as Prisma.InputJsonValue,
      enabledSkills,
      enabledGames,
      active: true,
      archivedAt: null,
    },
  });
}

async function archivePrefixed(courseId: string, prefix: string, games: string[]) {
  await prisma.question.updateMany({
    where: {
      courseId,
      game: { in: games },
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });
}

async function nextSort(courseId: string, game: string): Promise<number> {
  const agg = await prisma.question.aggregate({
    where: { courseId, game, archivedAt: null },
    _max: { sortOrder: true },
  });
  return agg._max.sortOrder ?? 0;
}

async function upsertSpeakingTopic(
  courseId: string,
  levelName: string,
  topic: ContentFile['speakingTopic'],
) {
  const instructions = buildDefaultTopicInstructions({
    topicTitle: topic.title,
    levelName,
    grade: 7,
  });
  const durationSeconds = topic.durationSeconds ?? 300;

  const existing = await prisma.speakingTopic.findFirst({
    where: { courseId, title: topic.title, archivedAt: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.speakingTopic.update({
      where: { id: existing.id },
      data: {
        instructions,
        durationSeconds,
        active: true,
        sortOrder: 1,
      },
    });
    return 'updated';
  }

  await prisma.speakingTopic.create({
    data: {
      courseId,
      title: topic.title,
      instructions,
      durationSeconds,
      active: true,
      sortOrder: 1,
    },
  });
  return 'created';
}

async function importUnit(unit: number, dryRun: boolean) {
  const path = contentPath(unit);
  if (!existsSync(path)) {
    throw new Error(`Missing content file: ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as ContentFile;
  if (raw.unit !== unit) {
    throw new Error(`Expected unit ${unit} in ${path}, got ${raw.unit}`);
  }

  const prefix = externalPrefix(unit);
  const rac = raw.read_and_complete ?? [];
  const circles = raw.choose_and_circle ?? [];

  console.log(`\n=== Import GS7 ${lop7UnitCourseName(unit)} (${LOP7_LEVEL}) ===`);
  console.log(
    `quiz=${raw.quiz.length} grammar=${raw.grammar.length} scramble=${raw.scramble.length} pronunciation=${raw.pronunciation.length} read_and_complete=${rac.length} choose_and_circle=${circles.length}`,
  );
  if (raw.skipped?.length) {
    console.log(`skipped=${raw.skipped.length}`);
  }
  if (dryRun) {
    console.log('[dry-run] no DB writes');
    return;
  }

  const course = await ensureLop7Course(prisma, unit);
  console.log(`course id=${course.id} name=${course.name}`);

  await archivePrefixed(course.id, prefix, [
    'quiz',
    'grammar',
    'scramble',
    'pronunciation',
    'read_and_complete',
    'choose_and_circle',
  ]);
  await ensureUnitSkills(course.id);

  let sortQuiz = await nextSort(course.id, 'quiz');
  let sortGrammar = await nextSort(course.id, 'grammar');
  let sortScramble = await nextSort(course.id, 'scramble');
  let sortPron = await nextSort(course.id, 'pronunciation');
  let sortRac = await nextSort(course.id, 'read_and_complete');
  let sortCircle = await nextSort(course.id, 'choose_and_circle');

  const counts = {
    quiz: 0,
    grammar: 0,
    scramble: 0,
    pronunciation: 0,
    read_and_complete: 0,
    choose_and_circle: 0,
  };

  for (let i = 0; i < raw.quiz.length; i++) {
    const item = raw.quiz[i]!;
    sortQuiz += 1;
    const seq = String(i + 1).padStart(3, '0');
    const payload = parseGamePayload('quiz', {
      type: item.type,
      typeLabel: item.typeLabel,
      skill: item.skill,
      exercise: item.exercise,
      question: item.question,
      answer: item.answer,
      options: item.options,
      accept: item.accept,
      fillMode: item.fillMode,
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
    counts.quiz += 1;
  }

  for (let i = 0; i < raw.grammar.length; i++) {
    const item = raw.grammar[i]!;
    sortGrammar += 1;
    const seq = String(i + 1).padStart(3, '0');
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
        externalId: `${prefix}GR-${seq}-${slugify(item.hint || item.prefix || item.source || 'g')}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts.grammar += 1;
  }

  for (let i = 0; i < raw.scramble.length; i++) {
    const item = raw.scramble[i]!;
    sortScramble += 1;
    const seq = String(i + 1).padStart(3, '0');
    const payload = parseGamePayload('scramble', {
      word: item.word,
      hint: item.hint ?? '',
      image: '',
    });
    await prisma.question.create({
      data: {
        courseId: course.id,
        game: 'scramble',
        active: true,
        sortOrder: sortScramble,
        externalId: `${prefix}SC-${seq}-${slugify(item.word)}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts.scramble += 1;
  }

  for (let i = 0; i < raw.pronunciation.length; i++) {
    const item = raw.pronunciation[i]!;
    sortPron += 1;
    const seq = String(i + 1).padStart(3, '0');
    const payload = parseGamePayload('pronunciation', {
      mode: item.mode,
      modeLabel: item.modeLabel ?? '',
      exercise: item.exercise ?? '',
      exerciseKey: item.exerciseKey ?? '',
      targetText: item.targetText,
      targetIpa: item.targetIpa ?? '',
      hint: item.hint ?? '',
      prompt: '',
      referenceAudioUrl: '',
      theoryText: '',
    });
    await prisma.question.create({
      data: {
        courseId: course.id,
        game: 'pronunciation',
        active: true,
        sortOrder: sortPron,
        externalId: `${prefix}PR-${seq}-${slugify(item.targetText)}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts.pronunciation += 1;
  }

  for (let i = 0; i < rac.length; i++) {
    const item = rac[i]!;
    sortRac += 1;
    const seq = String(i + 1).padStart(3, '0');
    const payload = parseGamePayload('read_and_complete', {
      title: item.title,
      instruction: item.instruction ?? 'Complete the sentences with words from the box.',
      word_bank: item.word_bank,
      items: item.items.map((row, index) => ({
        order: row.order || index + 1,
        sentence: row.sentence,
        image: row.image ?? '',
        answer: row.answer,
      })),
    });
    await prisma.question.create({
      data: {
        courseId: course.id,
        game: 'read_and_complete',
        active: true,
        sortOrder: sortRac,
        externalId: `${prefix}RC-${seq}-${slugify(item.title)}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts.read_and_complete += 1;
  }

  for (let i = 0; i < circles.length; i++) {
    const item = circles[i]!;
    sortCircle += 1;
    const seq = String(i + 1).padStart(3, '0');
    const payload = parseGamePayload('choose_and_circle', {
      title: item.title,
      instruction: item.instruction ?? 'Circle the correct option.',
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
  }

  const speakingAction = await upsertSpeakingTopic(course.id, LOP7_LEVEL, raw.speakingTopic);

  console.log('Imported:', counts, `speakingTopic=${speakingAction}`);
}

async function main() {
  const dryRun = isDryRun();
  const units = parseUnitArgs();
  for (const unit of units) {
    await importUnit(unit, dryRun);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

