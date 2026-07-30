/**
 * Shared question/progress counts for course skill cards and in-skill game grids.
 * Skill-scoped games (quiz, choose_and_circle) count only rows whose payload.skill matches.
 */
import { completedCountForIndices } from '@/lib/pronunciationExercises';
import { resolveQuizQuestionSkill } from '@/features/games/quiz/quizNav';
import { MULTI_SKILL_GAME_KEYS, type SkillId } from '@/lib/skillCatalog';

export type SkillScopedQuestion = {
  skill?: string | null;
};

export type GameSkillCountSlice = {
  questionCount: number;
  completedCount: number;
  indices: number[];
};

export type SkillProgressStats = {
  totalQuestions: number;
  completedQuestions: number;
  byGame: Record<string, { questionCount: number; completedCount: number }>;
};

export function isSkillScopedGame(gameKey: string): boolean {
  return MULTI_SKILL_GAME_KEYS.has(gameKey);
}

export function indicesForGameSkill(
  gameKey: string,
  skillId: SkillId,
  questions: SkillScopedQuestion[]
): number[] {
  if (!isSkillScopedGame(gameKey)) {
    return questions.map((_, index) => index);
  }
  const indices: number[] = [];
  for (let index = 0; index < questions.length; index += 1) {
    if (resolveQuizQuestionSkill(questions[index]?.skill) === skillId) {
      indices.push(index);
    }
  }
  return indices;
}

function completedStatusCount(statuses: string[] | undefined): number {
  return (statuses || []).filter((status) => status !== 'empty').length;
}

/** Count questions (+ completed) for one game under one skill. */
export function countQuestionsForGameSkill(input: {
  gameKey: string;
  skillId: SkillId;
  /** Ordered active questions (index aligns with statuses). Required for skill-scoped games. */
  questions?: SkillScopedQuestion[];
  /** Full-game total when questions are not loaded (exclusive games). */
  questionCount?: number;
  statuses?: string[];
}): GameSkillCountSlice {
  const statuses = input.statuses || [];
  const questions = input.questions || [];

  if (isSkillScopedGame(input.gameKey)) {
    const indices = indicesForGameSkill(input.gameKey, input.skillId, questions);
    return {
      indices,
      questionCount: indices.length,
      completedCount: completedCountForIndices(statuses, indices),
    };
  }

  const questionCount =
    typeof input.questionCount === 'number' ? input.questionCount : questions.length;
  const indices = Array.from({ length: questionCount }, (_, index) => index);
  return {
    indices,
    questionCount,
    completedCount: completedStatusCount(statuses),
  };
}

/** Sum per-game slices for a skill (skill cards / unit skill totals). */
export function aggregateSkillQuestionCounts(input: {
  skillId: SkillId;
  games: Array<{
    gameKey: string;
    questions?: SkillScopedQuestion[];
    questionCount?: number;
    statuses?: string[];
  }>;
}): SkillProgressStats {
  const byGame: SkillProgressStats['byGame'] = {};
  let totalQuestions = 0;
  let completedQuestions = 0;

  for (const game of input.games) {
    const slice = countQuestionsForGameSkill({
      gameKey: game.gameKey,
      skillId: input.skillId,
      questions: game.questions,
      questionCount: game.questionCount,
      statuses: game.statuses,
    });
    byGame[game.gameKey] = {
      questionCount: slice.questionCount,
      completedCount: slice.completedCount,
    };
    totalQuestions += slice.questionCount;
    completedQuestions += slice.completedCount;
  }

  return { totalQuestions, completedQuestions, byGame };
}
