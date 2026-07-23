import 'server-only';

import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import type { ProgressStatus } from '@/lib/gameCatalog';
import { loadGamePlayerState } from '@/lib/loadGamePlayerState';

type WordMatchPayload = {
  word?: unknown;
  image?: unknown;
  hint?: unknown;
};

export type WordMatchQuestion = {
  id: string;
  index: number;
  word: string;
  image: string;
  hint: string;
};

export type WordMatchGameData = {
  success: true;
  course: {
    id: string;
    name: string;
    levelName: string;
  };
  questions: WordMatchQuestion[];
  statuses: ProgressStatus[];
  playSessionId: string | null;
  gameScore: number;
};

function asWordMatchPayload(value: unknown): WordMatchPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as WordMatchPayload;
}

export async function loadWordMatchGame(
  courseId: string,
  userId: string
): Promise<WordMatchGameData | null> {
  const course = await findPlayableCourseGame(courseId, 'word_match');
  if (!course) return null;

  const [questions, player] = await Promise.all([
    prisma.question.findMany({
      where: {
        courseId: course.id,
        game: 'word_match',
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
      game: 'word_match',
    }),
  ]);

  return {
    success: true,
    course,
    questions: questions.map((question, index) => {
      const payload = asWordMatchPayload(question.payload);
      return {
        id: question.id,
        index,
        word: String(payload.word || '').trim(),
        image: String(payload.image || '').trim(),
        hint: String(payload.hint || '').trim(),
      };
    }),
    statuses: player.statuses,
    playSessionId: player.playSessionId,
    gameScore: player.gameScore,
  };
}
