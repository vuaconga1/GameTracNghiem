/**
 * Import Global Success 1 vocabulary into Grade 1 unit games:
 * pronunciation, scramble, word_match, choose_and_circle, read_and_complete,
 * read_and_match, vocabulary_test, vocabulary_check.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop1-vocab-games.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop1-vocab-games.ts
 */
import '../lib/loadEnv';

import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  findLop1CourseByUnit,
  LOP1_LEVEL,
  LOP1_UNIT_COUNT,
  lop1UnitCourseName,
} from '../lib/lop1Units';
import {
  getLop1UnitVocab,
  slugifyLop1Word,
  type Lop1VocabItem,
} from '../lib/lop1Vocab';
import { lop1VocabImagePath } from '../lib/lop1VocabImages';

const PREFIX = {
  pronunciation: 'GS1-PRON',
  scramble: 'GS1-SCRAMBLE',
  word_match: 'GS1-WM',
  choose_and_circle: 'GS1-CAC',
  read_and_complete: 'GS1-RAC',
  read_and_match: 'GS1-RAM',
  vocabulary_test: 'GS1-VTEST',
  vocabulary_check: 'GS1-VCHECK',
} as const;

type WordGame = 'pronunciation' | 'scramble' | 'word_match';
type ExerciseGame =
  | 'choose_and_circle'
  | 'read_and_complete'
  | 'read_and_match'
  | 'vocabulary_test'
  | 'vocabulary_check';

function otherWords(words: Lop1VocabItem[], keep: string): string[] {
  return words.map((w) => w.word).filter((w) => w.toLowerCase() !== keep.toLowerCase());
}

function articleFor(word: string): string {
  const lower = word.toLowerCase();
  if (/^[aeiou]/.test(lower)) return 'an';
  return 'a';
}

async function archiveGame(courseId: string, game: string, prefix: string) {
  await prisma.question.updateMany({
    where: {
      courseId,
      game,
      archivedAt: null,
      OR: [{ externalId: { startsWith: prefix } }, { externalId: null }],
    },
    data: { archivedAt: new Date(), active: false },
  });
  await prisma.question.updateMany({
    where: { courseId, game, archivedAt: null },
    data: { archivedAt: new Date(), active: false },
  });
}

async function importWordGames(
  courseId: string,
  unit: number,
  words: Lop1VocabItem[],
  sound: string,
) {
  const counts: Record<WordGame, number> = {
    pronunciation: 0,
    scramble: 0,
    word_match: 0,
  };

  for (const game of Object.keys(counts) as WordGame[]) {
    const prefix = `${PREFIX[game]}-U${unit}-`;
    await archiveGame(courseId, game, prefix);

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      const slug = slugifyLop1Word(item.word);
      const externalId = `${prefix}${String(i + 1).padStart(2, '0')}-${slug}`;

      let payload: Prisma.InputJsonValue;
      if (game === 'pronunciation') {
        payload = parseGamePayload('pronunciation', {
          mode: 'word',
          modeLabel: 'Luyện từ',
          exercise: `Âm ${sound}`,
          exerciseKey: sound.replace(/[^a-zA-Z]/g, '').toUpperCase() || `U${unit}`,
          prompt: `Đọc từ vựng Unit ${unit}`,
          targetText: item.word,
          targetIpa: item.ipa || '',
          referenceAudioUrl: '',
          hint: item.hint,
        }) as Prisma.InputJsonValue;
      } else {
        payload = parseGamePayload(game, {
          word: item.word,
          hint: item.hint,
          image: lop1VocabImagePath(unit, item.word),
        }) as Prisma.InputJsonValue;
      }

      await prisma.question.create({
        data: {
          courseId,
          game,
          active: true,
          sortOrder: i + 1,
          externalId,
          payload,
        },
      });
      counts[game] += 1;
    }
  }

  return counts;
}

async function importExerciseGames(
  courseId: string,
  unit: number,
  words: Lop1VocabItem[],
) {
  const wordList = words.map((w) => w.word);
  const counts: Record<ExerciseGame, number> = {
    choose_and_circle: 0,
    read_and_complete: 0,
    read_and_match: 0,
    vocabulary_test: 0,
    vocabulary_check: 0,
  };

  // choose_and_circle
  {
    const game: ExerciseGame = 'choose_and_circle';
    const prefix = `${PREFIX[game]}-U${unit}-`;
    await archiveGame(courseId, game, prefix);
    const items = words.map((item, index) => {
      const distractors = otherWords(words, item.word).slice(0, 2);
      const options = [item.word, ...distractors];
      // Stable shuffle by rotating
      const rotated = [
        ...options.slice(index % options.length),
        ...options.slice(0, index % options.length),
      ];
      return {
        order: index + 1,
        image: lop1VocabImagePath(unit, item.word),
        prompt: `Chọn từ đúng: ${item.hint}`,
        options: rotated,
        answer: item.word,
      };
    });
    const payload = parseGamePayload(game, {
      title: `Unit ${unit} — Chọn và khoanh`,
      instruction: 'Circle the correct word.',
      items,
    });
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefix}01`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts[game] = 1;
  }

  // read_and_complete
  {
    const game: ExerciseGame = 'read_and_complete';
    const prefix = `${PREFIX[game]}-U${unit}-`;
    await archiveGame(courseId, game, prefix);
    const items = words.map((item, index) => ({
      order: index + 1,
      sentence: `This is ${articleFor(item.word)} _____.`,
      image: lop1VocabImagePath(unit, item.word),
      answer: item.word,
    }));
    const payload = parseGamePayload(game, {
      title: `Unit ${unit} — Đọc và hoàn thành`,
      instruction: 'Complete the sentences with words from the box.',
      word_bank: wordList,
      items,
    });
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefix}01`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts[game] = 1;
  }

  // read_and_match
  {
    const game: ExerciseGame = 'read_and_match';
    const prefix = `${PREFIX[game]}-U${unit}-`;
    await archiveGame(courseId, game, prefix);
    const items = words.map((item, index) => ({
      order: index + 1,
      sentence: `This is ${articleFor(item.word)} ${item.word}.`,
      image: lop1VocabImagePath(unit, item.word),
      label: item.hint,
      answer: item.word,
    }));
    const payload = parseGamePayload(game, {
      title: `Unit ${unit} — Đọc và nối`,
      instruction: 'Match each sentence to the correct meaning.',
      items,
    });
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefix}01`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts[game] = 1;
  }

  // vocabulary_test
  {
    const game: ExerciseGame = 'vocabulary_test';
    const prefix = `${PREFIX[game]}-U${unit}-`;
    await archiveGame(courseId, game, prefix);
    const items = words.map((item, index) => ({
      order: index + 1,
      image: lop1VocabImagePath(unit, item.word),
      answer: item.word,
    }));
    const payload = parseGamePayload(game, {
      title: `Unit ${unit} — Kiểm tra từ vựng`,
      instruction: 'Look at the pictures and write the English words from the word bank.',
      word_bank: wordList,
      items,
    });
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefix}01`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts[game] = 1;
  }

  // vocabulary_check (2 true + 2 false)
  {
    const game: ExerciseGame = 'vocabulary_check';
    const prefix = `${PREFIX[game]}-U${unit}-`;
    await archiveGame(courseId, game, prefix);
    const items = words.map((item, index) => {
      const isCorrect = index % 2 === 0;
      const wrong = otherWords(words, item.word)[0] || item.word;
      return {
        order: index + 1,
        image: lop1VocabImagePath(unit, item.word),
        word: item.word,
        sentence: isCorrect
          ? `This is ${articleFor(item.word)} ${item.word}.`
          : `This is ${articleFor(wrong)} ${wrong}.`,
        is_correct: isCorrect,
      };
    });
    const payload = parseGamePayload(game, {
      title: `Unit ${unit} — Kiểm tra đúng sai`,
      instruction: 'Look at the word. Is the sentence correct?',
      items,
    });
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefix}01`,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    counts[game] = 1;
  }

  return counts;
}

async function importUnit(unit: number) {
  const course = await findLop1CourseByUnit(prisma, unit);
  if (!course) {
    throw new Error(`Không tìm thấy khóa ${LOP1_LEVEL} / ${lop1UnitCourseName(unit)}`);
  }

  const vocab = getLop1UnitVocab(unit);
  const wordCounts = await importWordGames(
    course.id,
    unit,
    vocab.words,
    vocab.sound,
  );
  const exerciseCounts = await importExerciseGames(course.id, unit, vocab.words);

  console.log(
    `${LOP1_LEVEL} ${course.name}: scramble/wm/pron=${vocab.words.length}, exercises=${Object.values(exerciseCounts).reduce((a, b) => a + b, 0)}`,
  );
  return { wordCounts, exerciseCounts, words: vocab.words.length };
}

async function main() {
  let totalWords = 0;
  for (let unit = 1; unit <= LOP1_UNIT_COUNT; unit++) {
    const result = await importUnit(unit);
    totalWords += result.words;
  }
  console.log(
    `\nDone: ${LOP1_UNIT_COUNT} units, ${totalWords} vocab words × 3 word-games + 5 exercise games / unit.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
