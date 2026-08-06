import 'server-only';

import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import type { ProgressStatus } from '@/lib/gameCatalog';
import { loadGamePlayerState } from '@/lib/loadGamePlayerState';

type VocabularyTestPayload = {
  title?: unknown;
  instruction?: unknown;
  word_bank?: unknown;
  items?: unknown;
};

type VocabularyTestItemPayload = {
  order?: unknown;
  image?: unknown;
  answer?: unknown;
};

export type VocabularyTestItem = {
  order: number;
  image: string;
  answer: string;
};

export type VocabularyTestExercise = {
  id: string;
  index: number;
  title: string;
  instruction: string;
  word_bank: string[];
  items: VocabularyTestItem[];
};

export type VocabularyTestGameData = {
  success: true;
  course: {
    id: string;
    name: string;
    levelName: string;
  };
  exercises: VocabularyTestExercise[];
  unitTotal: number;
  statuses: ProgressStatus[];
  gameScore: number;
  playSessionId: string | null;
};

function asPayload(value: unknown): VocabularyTestPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as VocabularyTestPayload;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

/** Prefer English answers when the stored word bank is empty or only Vietnamese hints. */
function resolveWordBank(wordBank: string[], answers: string[]): string[] {
  const englishAnswers = answers.map((answer) => answer.trim()).filter(Boolean);
  if (!englishAnswers.length) return wordBank;
  if (!wordBank.length) return englishAnswers;

  const answerSet = new Set(englishAnswers.map((answer) => answer.toLowerCase()));
  const bankHasEnglishAnswer = wordBank.some((word) => answerSet.has(word.toLowerCase()));
  return bankHasEnglishAnswer ? wordBank : englishAnswers;
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
      const payload = item as VocabularyTestItemPayload;
      const order = Number(payload.order);
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        image: String(payload.image || '').trim(),
        answer: String(payload.answer || '').trim(),
      };
    })
    .filter((item): item is VocabularyTestItem => item !== null)
    .sort((a, b) => a.order - b.order);
}

export async function loadVocabularyTestGame(
  courseId: string,
  userId?: string | null,
): Promise<VocabularyTestGameData | null> {
  const course = await findPlayableCourseGame(courseId, 'vocabulary_test');
  if (!course) return null;

  const [questions, player] = await Promise.all([
    prisma.question.findMany({
      where: {
        courseId: course.id,
        game: 'vocabulary_test',
        active: true,
        archivedAt: null,
      },
      select: {
        id: true,
        payload: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    loadGamePlayerState({
      userId,
      courseName: course.name,
      levelName: course.levelName,
      game: 'vocabulary_test',
    }),
  ]);

  const exercises = questions.map((question, index) => {
    const payload = asPayload(question.payload);
    const items = parseItems(payload.items);
    const answers = items.map((item) => item.answer).filter(Boolean);
    return {
      id: question.id,
      index,
      title: String(payload.title || '').trim() || `Bài ${index + 1}`,
      instruction:
        String(payload.instruction || '').trim() ||
        'Look at the pictures and write the correct English words.',
      word_bank: resolveWordBank(stringList(payload.word_bank), answers),
      items,
    };
  });

  return {
    success: true,
    course,
    exercises,
    unitTotal: exercises.reduce((total, exercise) => total + exercise.items.length, 0),
    statuses: player.statuses,
    playSessionId: player.playSessionId,
    gameScore: player.gameScore,
  };
}
