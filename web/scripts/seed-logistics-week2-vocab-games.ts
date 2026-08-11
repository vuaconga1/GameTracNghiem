/**
 * Replace Week 2 scramble + pronunciation questions from curated vocab decks
 * (cleaner than raw PDF hotspot extraction).
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-logistics-week2-vocab-games.ts
 */
import '../lib/loadEnv';

import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  LOGISTICS_LEVEL,
  LOGISTICS_WEEK2_COURSES,
} from '../lib/logisticsUnits';
import { getCourseVocabDeck, logisticsGameWord, type LogisticsVocabCard } from '../lib/logisticsVocabDeck';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  SKILL_IDS,
} from '../lib/skillCatalog';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';

const EXTERNAL_PREFIX = 'LOG-VOCAB';

function slugWord(word: string) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

async function ensureSkills(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.scramble = 'vocabulary';
  map.pronunciation = 'speaking';
  if (map.quiz === 'vocabulary') map.quiz = null;

  const enabledSkills = SKILL_IDS.filter((id) => id === 'vocabulary' || id === 'speaking');
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

async function ensureSpeakingSkillLesson(courseId: string) {
  const vocab = await prisma.courseSkillLesson.findUnique({
    where: { courseId_skillId: { courseId, skillId: 'vocabulary' } },
  });
  if (!vocab) return;
  await prisma.courseSkillLesson.upsert({
    where: { courseId_skillId: { courseId, skillId: 'speaking' } },
    create: {
      courseId,
      skillId: 'speaking',
      pageStart: vocab.pageStart,
      pageEnd: vocab.pageEnd,
    },
    update: {
      pageStart: vocab.pageStart,
      pageEnd: vocab.pageEnd,
    },
  });
}

async function replaceGameQuestions(
  courseId: string,
  game: 'scramble' | 'pronunciation',
  prefix: string,
  cards: LogisticsVocabCard[]
) {
  await prisma.question.updateMany({
    where: { courseId, game, archivedAt: null },
    data: { archivedAt: new Date(), active: false },
  });

  let created = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const gameWord = logisticsGameWord(card.word);
    const payload =
      game === 'scramble'
        ? parseGamePayload(game, { word: gameWord, hint: card.meaning, image: '' })
        : parseGamePayload(game, {
            mode: 'word',
            targetText: gameWord,
            targetIpa: '',
            hint: card.meaning,
            exercise: 'Logistics vocabulary',
            referenceAudioUrl: '',
          });
    const externalId = `${prefix}-${String(i + 1).padStart(2, '0')}-${slugWord(gameWord)}`;
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: i + 1,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }
  return created;
}

async function upsertSpeakingTopic(courseId: string, title: string) {
  const instructions = buildDefaultTopicInstructions({
    topicTitle: title,
    grade: 9,
    levelName: LOGISTICS_LEVEL,
  });
  const existing = await prisma.speakingTopic.findFirst({
    where: { courseId, title, archivedAt: null },
    select: { id: true },
  });
  if (existing) {
    await prisma.speakingTopic.update({
      where: { id: existing.id },
      data: { instructions, durationSeconds: 300, active: true, sortOrder: 1 },
    });
    return 'updated';
  }
  await prisma.speakingTopic.create({
    data: {
      courseId,
      title,
      instructions,
      durationSeconds: 300,
      active: true,
      sortOrder: 1,
    },
  });
  return 'created';
}

async function main() {
  for (const seed of LOGISTICS_WEEK2_COURSES) {
    const cards = getCourseVocabDeck(seed.id);
    if (!cards?.length) {
      console.warn(`No deck for ${seed.key}`);
      continue;
    }
    console.log(`\n=== ${seed.key} (${cards.length} cards)`);
    await ensureSkills(seed.id);
    await ensureSpeakingSkillLesson(seed.id);
    const scramble = await replaceGameQuestions(
      seed.id,
      'scramble',
      `${EXTERNAL_PREFIX}-${seed.key}-SCR`,
      cards
    );
    const pronunciation = await replaceGameQuestions(
      seed.id,
      'pronunciation',
      `${EXTERNAL_PREFIX}-${seed.key}-PRON`,
      cards
    );
    const speaking = await upsertSpeakingTopic(seed.id, seed.speakingTitle);
    console.log(`  scramble ${scramble}, pronunciation ${pronunciation}, speaking ${speaking}`);
  }
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
