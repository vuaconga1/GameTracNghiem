/**
 * Import vocabulary into primary Grade 2/3/5 unit games
 * (same game set as Lớp 1).
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-primary-vocab-games.ts --grade=all
 */
import '../lib/loadEnv';

import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import { lop2VocabImagePath } from '../lib/lop2VocabImages';
import { lop3VocabImagePath } from '../lib/lop3VocabImages';
import { lop4VocabImagePath } from '../lib/lop4VocabImages';
import { lop5VocabImagePath } from '../lib/lop5VocabImages';
import {
  findCourseByUnit,
  slugifyWord,
  type PrimaryVocabItem,
} from '../lib/primaryGradeConfig';
import {
  parsePrimaryGradeArg,
  PRIMARY_GRADE_SPECS,
  type PrimaryGradeId,
} from '../lib/primaryGradeSpecs';

function vocabImagePath(grade: PrimaryGradeId, unit: number, word: string): string {
  if (grade === 2) return lop2VocabImagePath(unit, word);
  if (grade === 3) return lop3VocabImagePath(unit, word);
  if (grade === 4) return lop4VocabImagePath(unit, word);
  return lop5VocabImagePath(unit, word);
}

type WordGame = 'pronunciation' | 'scramble' | 'word_match';
type ExerciseGame =
  | 'choose_and_circle'
  | 'read_and_complete'
  | 'read_and_match'
  | 'vocabulary_test'
  | 'vocabulary_check';

function otherWords(words: PrimaryVocabItem[], keep: string): string[] {
  return words.map((w) => w.word).filter((w) => w.toLowerCase() !== keep.toLowerCase());
}

function articleFor(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

async function archiveGame(courseId: string, game: string) {
  await prisma.question.updateMany({
    where: { courseId, game, archivedAt: null },
    data: { archivedAt: new Date(), active: false },
  });
}

async function importWordGames(
  courseId: string,
  prefixBase: string,
  grade: PrimaryGradeId,
  unit: number,
  words: PrimaryVocabItem[],
  sound: string,
) {
  for (const game of ['pronunciation', 'scramble', 'word_match'] as WordGame[]) {
    const prefix = `${prefixBase}-${game === 'pronunciation' ? 'PRON' : game === 'scramble' ? 'SCRAMBLE' : 'WM'}-U${unit}-`;
    await archiveGame(courseId, game);
    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      const externalId = `${prefix}${String(i + 1).padStart(2, '0')}-${slugifyWord(item.word)}`;
      let payload: Prisma.InputJsonValue;
      if (game === 'pronunciation') {
        payload = parseGamePayload('pronunciation', {
          mode: 'word',
          modeLabel: 'Luyện từ',
          exercise: sound ? `Âm ${sound}` : `Unit ${unit}`,
          exerciseKey: (sound || `U${unit}`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `U${unit}`,
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
          image: vocabImagePath(grade, unit, item.word),
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
    }
  }
}

async function importExerciseGames(
  courseId: string,
  prefixBase: string,
  grade: PrimaryGradeId,
  unit: number,
  words: PrimaryVocabItem[],
) {
  const wordList = words.map((w) => w.word);

  {
    const game: ExerciseGame = 'choose_and_circle';
    await archiveGame(courseId, game);
    const items = words.map((item, index) => {
      const distractors = otherWords(words, item.word).slice(0, 2);
      while (distractors.length < 2 && wordList.length > 1) {
        const extra = wordList.find(
          (w) =>
            w.toLowerCase() !== item.word.toLowerCase() &&
            !distractors.some((d) => d.toLowerCase() === w.toLowerCase()),
        );
        if (!extra) break;
        distractors.push(extra);
      }
      const options = [item.word, ...distractors];
      const rotated = [
        ...options.slice(index % options.length),
        ...options.slice(0, index % options.length),
      ];
      return {
        order: index + 1,
        image: vocabImagePath(grade, unit, item.word),
        prompt: `Chọn từ đúng: ${item.hint}`,
        options: rotated.length >= 2 ? rotated : [item.word, item.hint],
        answer: item.word,
      };
    });
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefixBase}-CAC-U${unit}-01`,
        payload: parseGamePayload(game, {
          title: `Unit ${unit} — Chọn và khoanh`,
          instruction: 'Circle the correct word.',
          items,
        }) as Prisma.InputJsonValue,
      },
    });
  }

  {
    const game: ExerciseGame = 'read_and_complete';
    await archiveGame(courseId, game);
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefixBase}-RAC-U${unit}-01`,
        payload: parseGamePayload(game, {
          title: `Unit ${unit} — Đọc và hoàn thành`,
          instruction: 'Complete the sentences with words from the box.',
          word_bank: wordList,
          items: words.map((item, index) => ({
            order: index + 1,
            sentence: `This is ${articleFor(item.word)} _____.`,
            image: vocabImagePath(grade, unit, item.word),
            answer: item.word,
          })),
        }) as Prisma.InputJsonValue,
      },
    });
  }

  {
    const game: ExerciseGame = 'read_and_match';
    await archiveGame(courseId, game);
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefixBase}-RAM-U${unit}-01`,
        payload: parseGamePayload(game, {
          title: `Unit ${unit} — Đọc và nối`,
          instruction: 'Match each sentence to the correct meaning.',
          items: words.map((item, index) => ({
            order: index + 1,
            sentence: `This is ${articleFor(item.word)} ${item.word}.`,
            image: vocabImagePath(grade, unit, item.word),
            label: item.hint,
            answer: item.word,
          })),
        }) as Prisma.InputJsonValue,
      },
    });
  }

  {
    const game: ExerciseGame = 'vocabulary_test';
    await archiveGame(courseId, game);
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefixBase}-VTEST-U${unit}-01`,
        payload: parseGamePayload(game, {
          title: `Unit ${unit} — Kiểm tra từ vựng`,
          instruction: 'Look at the pictures and write the English words from the word bank.',
          word_bank: words.map((w) => w.word),
          items: words.map((item, index) => ({
            order: index + 1,
            image: vocabImagePath(grade, unit, item.word),
            answer: item.word,
          })),
        }) as Prisma.InputJsonValue,
      },
    });
  }

  {
    const game: ExerciseGame = 'vocabulary_check';
    await archiveGame(courseId, game);
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: 1,
        externalId: `${prefixBase}-VCHECK-U${unit}-01`,
        payload: parseGamePayload(game, {
          title: `Unit ${unit} — Kiểm tra đúng sai`,
          instruction: 'Look at the word. Is the sentence correct?',
          items: words.map((item, index) => {
            const isCorrect = index % 2 === 0;
            const wrong = otherWords(words, item.word)[0] || item.word;
            return {
              order: index + 1,
              image: vocabImagePath(grade, unit, item.word),
              word: item.word,
              sentence: isCorrect
                ? `This is ${articleFor(item.word)} ${item.word}.`
                : `This is ${articleFor(wrong)} ${wrong}.`,
              is_correct: isCorrect,
            };
          }),
        }) as Prisma.InputJsonValue,
      },
    });
  }
}

async function importGrade(grade: PrimaryGradeId) {
  const spec = PRIMARY_GRADE_SPECS[grade];
  let totalWords = 0;
  for (let unit = 1; unit <= spec.unitCount; unit++) {
    const course = await findCourseByUnit(prisma, spec.levelName, unit);
    if (!course) {
      throw new Error(`Không tìm thấy ${spec.levelName} / Unit ${unit}`);
    }
    const vocab = spec.getVocab(unit);
    await importWordGames(
      course.id,
      spec.gsPrefix,
      grade,
      unit,
      vocab.words,
      vocab.sound || '',
    );
    await importExerciseGames(course.id, spec.gsPrefix, grade, unit, vocab.words);
    totalWords += vocab.words.length;
    console.log(
      `${spec.levelName} ${course.name}: ${vocab.words.length} từ × 3 word-games + 5 exercises`,
    );
  }
  console.log(`\n${spec.levelName} done: ${spec.unitCount} units, ${totalWords} vocab words.`);
}

async function main() {
  const grades = parsePrimaryGradeArg(process.argv.slice(2));
  for (const grade of grades) {
    await importGrade(grade);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
