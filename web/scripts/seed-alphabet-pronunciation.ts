/**
 * Seed the "Bảng chữ cái" (Alphabet) home level.
 *
 * Creates one durable Course per letter A–Z (name "Aa", "Bb", …) under the
 * ALPHABET_LEVEL, and fills each with pronunciation questions built from the
 * distinct English vocabulary already stored across every other course
 * (look-and-write, scramble, word-match, pronunciation targetText, …).
 *
 * The pronunciation game path is reused verbatim, so scoring → leaderboard keeps
 * working. Fully idempotent: re-running rebuilds courses + questions in place.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-alphabet-pronunciation.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-alphabet-pronunciation.ts --max 60
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import {
  ALPHABET_LETTERS,
  ALPHABET_LEVEL,
  alphabetCourseId,
  alphabetCourseName,
  alphabetLetterForWord,
} from '../lib/alphabetLevel';
import { prisma } from '../lib/db';
import { slugifyVocabWord } from '../lib/vocabImagePath';

const GAME = 'pronunciation';
const EXTERNAL_PREFIX = 'ALPHABET';

/** Single English token (letters, optional internal apostrophe/hyphen). */
const WORD_RE = /^[A-Za-z][A-Za-z'-]*$/;

type VocabEntry = {
  word: string;
  image: string;
  ipa: string;
  hint: string;
};

function parseMaxArg(): number {
  const idx = process.argv.indexOf('--max');
  if (idx < 0) return 60;
  const n = Number(process.argv[idx + 1]);
  return Number.isInteger(n) && n > 0 ? n : 60;
}

function cleanWord(value: unknown): string {
  return String(value || '').trim();
}

function isSeedableWord(word: string): boolean {
  return WORD_RE.test(word) && word.length >= 2 && word.length <= 24;
}

/** Pull (word, image, ipa, hint) candidates out of one question payload. */
function extractFromPayload(game: string, payload: unknown): VocabEntry[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;
  const out: VocabEntry[] = [];

  const push = (word: unknown, image?: unknown, ipa?: unknown, hint?: unknown) => {
    const w = cleanWord(word);
    if (!isSeedableWord(w)) return;
    out.push({
      word: w,
      image: cleanWord(image),
      ipa: cleanWord(ipa),
      hint: cleanWord(hint),
    });
  };

  if (game === 'pronunciation') {
    push(data.targetText, data.image, data.targetIpa, data.hint);
  } else if (game === 'scramble' || game === 'word_match') {
    push(data.word, data.image, undefined, data.hint);
  } else if (game === 'vocabulary_check') {
    for (const item of asItems(data.items)) push(item.word, item.image);
  } else if (Array.isArray(data.items)) {
    // look_and_write / choose_and_circle / read_and_complete /
    // read_and_match / vocabulary_test all key the English word on `answer`.
    for (const item of asItems(data.items)) push(item.answer, item.image);
  }

  return out;
}

function asItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  );
}

async function collectVocab(): Promise<Map<string, VocabEntry[]>> {
  const questions = await prisma.question.findMany({
    where: {
      active: true,
      archivedAt: null,
      course: { levelName: { not: ALPHABET_LEVEL }, active: true },
    },
    select: { game: true, payload: true },
  });

  // letter → (lowercased word → best entry)
  const byLetter = new Map<string, Map<string, VocabEntry>>();

  for (const q of questions) {
    for (const entry of extractFromPayload(q.game, q.payload)) {
      const letter = alphabetLetterForWord(entry.word);
      if (!letter) continue;
      const bucket = byLetter.get(letter) || new Map<string, VocabEntry>();
      const key = entry.word.toLowerCase();
      const existing = bucket.get(key);
      if (!existing) {
        bucket.set(key, entry);
      } else {
        // Enrich: keep first casing, fill missing image / ipa / hint.
        if (!existing.image && entry.image) existing.image = entry.image;
        if (!existing.ipa && entry.ipa) existing.ipa = entry.ipa;
        if (!existing.hint && entry.hint) existing.hint = entry.hint;
      }
      byLetter.set(letter, bucket);
    }
  }

  const result = new Map<string, VocabEntry[]>();
  for (const [letter, bucket] of byLetter) {
    const words = [...bucket.values()].sort((a, b) =>
      a.word.toLowerCase().localeCompare(b.word.toLowerCase(), 'en')
    );
    result.set(letter, words);
  }
  return result;
}

async function ensureAlphabetLevel() {
  await prisma.classLevel.upsert({
    where: { levelName: ALPHABET_LEVEL },
    create: { levelName: ALPHABET_LEVEL, active: true },
    update: { active: true, archivedAt: null },
  });
}

async function seedLetter(letter: string, words: VocabEntry[], max: number) {
  const id = alphabetCourseId(letter);
  const name = alphabetCourseName(letter);
  const gameSkills = { pronunciation: 'speaking' } as Prisma.InputJsonValue;

  await prisma.course.upsert({
    where: { id },
    create: {
      id,
      name,
      levelName: ALPHABET_LEVEL,
      active: true,
      enabledGames: [GAME],
      enabledSkills: ['speaking'],
      gameSkills,
    },
    update: {
      name,
      levelName: ALPHABET_LEVEL,
      active: true,
      archivedAt: null,
      enabledGames: [GAME],
      enabledSkills: ['speaking'],
      gameSkills,
    },
  });

  // Rebuild questions in place for idempotency.
  await prisma.question.deleteMany({ where: { courseId: id, game: GAME } });

  const selected = words.slice(0, max);
  const rows: Prisma.QuestionCreateManyInput[] = selected.map((entry, i) => {
    const payload = parseGamePayload(GAME, {
      mode: 'word',
      modeLabel: 'Luyện từ',
      exercise: `Chữ ${letter}`,
      exerciseKey: letter,
      prompt: `Đọc to từ bắt đầu bằng chữ ${letter}`,
      targetText: entry.word,
      targetIpa: entry.ipa,
      referenceAudioUrl: '',
      image: entry.image,
      hint: entry.hint,
    });
    return {
      courseId: id,
      game: GAME,
      active: true,
      sortOrder: i + 1,
      externalId: `${EXTERNAL_PREFIX}-${letter}-${slugifyVocabWord(entry.word)}`,
      payload: payload as Prisma.InputJsonValue,
    };
  });

  if (rows.length) {
    await prisma.question.createMany({ data: rows });
  }
  return rows.length;
}

async function main() {
  const max = parseMaxArg();
  await ensureAlphabetLevel();

  const vocab = await collectVocab();
  let totalWords = 0;
  let lettersSeeded = 0;

  for (const letter of ALPHABET_LETTERS) {
    const words = vocab.get(letter) || [];
    if (words.length === 0) {
      // Remove any stale course/questions for an empty letter.
      await prisma.question.deleteMany({ where: { courseId: alphabetCourseId(letter), game: GAME } });
      await prisma.course.updateMany({
        where: { id: alphabetCourseId(letter) },
        data: { active: false, archivedAt: new Date() },
      });
      console.log(`  ${letter}: (no vocab, skipped)`);
      continue;
    }
    const created = await seedLetter(letter, words, max);
    lettersSeeded += 1;
    totalWords += created;
    console.log(`  ${letter}: ${created} words (of ${words.length} available)`);
  }

  console.log(
    `\nDone: level="${ALPHABET_LEVEL}" letters=${lettersSeeded} pronunciationWords=${totalWords} (max ${max}/letter)`
  );
}

if (process.argv[1]?.endsWith('seed-alphabet-pronunciation.ts')) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
