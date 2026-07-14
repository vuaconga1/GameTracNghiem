import { z } from 'zod';

import { GAME_CATALOG } from '@/lib/gameCatalog';

export const ADMIN_GAME_KEYS = GAME_CATALOG.map((game) => game.key);

const nonEmpty = z.string().trim().min(1, 'Không được để trống');

export const grammarPayloadSchema = z.object({
  source: z.string().optional().default(''),
  prefix: nonEmpty,
  suffix: z.string().optional().default(''),
  hint: z.string().optional().default(''),
  answers: z.array(nonEmpty).min(1, 'Cần ít nhất một đáp án'),
});

export const quizPayloadSchema = z.object({
  type: z.enum(['multiple_choice', 'fill_blank', 'word_form']).default('multiple_choice'),
  typeLabel: z.string().optional().default(''),
  question: nonEmpty,
  answer: nonEmpty,
  options: z.array(z.string()).default([]),
  accept: z.array(z.string()).default([]),
  fillMode: z.boolean().optional(),
});

export const pronunciationPayloadSchema = z.object({
  mode: z.enum(['phoneme', 'word', 'sentence']).default('phoneme'),
  modeLabel: z.string().optional().default(''),
  prompt: z.string().optional().default(''),
  targetText: nonEmpty,
  targetIpa: z.string().optional().default(''),
  referenceAudioUrl: z.string().optional().default(''),
  hint: z.string().optional().default(''),
});

export const scramblePayloadSchema = z.object({
  word: nonEmpty,
  hint: z.string().optional().default(''),
  image: z.string().optional().default(''),
});

export const wordMatchPayloadSchema = z.object({
  word: nonEmpty,
  hint: z.string().optional().default(''),
  image: z.string().optional().default(''),
});

const lookItemSchema = z.object({
  order: z.number().int().positive(),
  image: z.string().optional().default(''),
  answer: nonEmpty,
});

export const lookAndWritePayloadSchema = z.object({
  title: nonEmpty,
  instruction: z.string().optional().default('Look and write.'),
  word_bank: z.array(z.string()).default([]),
  items: z.array(lookItemSchema).min(1, 'Cần ít nhất một dòng'),
});

const chooseItemSchema = z.object({
  order: z.number().int().positive(),
  image: z.string().optional().default(''),
  options: z.array(nonEmpty).min(2, 'Cần 2 lựa chọn'),
  answer: nonEmpty,
});

export const chooseAndCirclePayloadSchema = z.object({
  title: nonEmpty,
  instruction: z.string().optional().default('Look at the picture and circle the correct word.'),
  items: z.array(chooseItemSchema).min(1),
});

const completeItemSchema = z.object({
  order: z.number().int().positive(),
  sentence: nonEmpty,
  image: z.string().optional().default(''),
  answer: nonEmpty,
});

export const readAndCompletePayloadSchema = z.object({
  title: nonEmpty,
  instruction: z.string().optional().default('Complete the sentences with words from the box.'),
  word_bank: z.array(z.string()).default([]),
  items: z.array(completeItemSchema).min(1),
});

const matchItemSchema = z.object({
  order: z.number().int().positive(),
  sentence: nonEmpty,
  image: z.string().optional().default(''),
  label: nonEmpty,
  answer: nonEmpty,
});

export const readAndMatchPayloadSchema = z.object({
  title: nonEmpty,
  instruction: z.string().optional().default('Match each sentence to the correct picture.'),
  items: z.array(matchItemSchema).min(1),
});

export const vocabularyTestPayloadSchema = z.object({
  title: nonEmpty,
  instruction: z.string().optional().default('Look at the pictures and write the words.'),
  word_bank: z.array(z.string()).default([]),
  items: z.array(lookItemSchema).min(1),
});

const checkItemSchema = z.object({
  order: z.number().int().positive(),
  image: z.string().optional().default(''),
  word: nonEmpty,
  sentence: nonEmpty,
  is_correct: z.boolean(),
});

export const vocabularyCheckPayloadSchema = z.object({
  title: nonEmpty,
  instruction: z
    .string()
    .optional()
    .default('Look at the picture and word. Is the sentence correct?'),
  items: z.array(checkItemSchema).min(1),
});

const schemaByGame = {
  grammar: grammarPayloadSchema,
  quiz: quizPayloadSchema,
  pronunciation: pronunciationPayloadSchema,
  scramble: scramblePayloadSchema,
  word_match: wordMatchPayloadSchema,
  look_and_write: lookAndWritePayloadSchema,
  choose_and_circle: chooseAndCirclePayloadSchema,
  read_and_complete: readAndCompletePayloadSchema,
  read_and_match: readAndMatchPayloadSchema,
  vocabulary_test: vocabularyTestPayloadSchema,
  vocabulary_check: vocabularyCheckPayloadSchema,
} as const;

export type AdminGameKey = keyof typeof schemaByGame;

export function isAdminGameKey(value: string): value is AdminGameKey {
  return value in schemaByGame;
}

export function parseGamePayload(game: string, payload: unknown) {
  if (!isAdminGameKey(game)) {
    throw new Error('Loại game không hợp lệ');
  }
  return schemaByGame[game].parse(payload);
}

export const EXERCISE_GAMES = new Set<AdminGameKey>([
  'look_and_write',
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
]);

export function questionPreview(game: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '—';
  const data = payload as Record<string, unknown>;
  if (game === 'grammar') {
    return `${String(data.prefix || '')} ___ ${String(data.suffix || '')}`.trim();
  }
  if (game === 'quiz') return String(data.question || '—');
  if (game === 'pronunciation') return String(data.targetText || '—');
  if (game === 'scramble' || game === 'word_match') return String(data.word || '—');
  return String(data.title || '—');
}
