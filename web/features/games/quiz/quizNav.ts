import type { SkillId } from '@/lib/skillCatalog';
import { isSkillId } from '@/lib/skillCatalog';

export const QUIZ_TYPES = ['multiple_choice', 'fill_blank', 'word_form'] as const;

export type QuizType = (typeof QUIZ_TYPES)[number];

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  multiple_choice: 'Trắc nghiệm',
  fill_blank: 'Điền từ',
  word_form: 'Từ loại',
};

export const DEFAULT_QUIZ_EXERCISE = 'Khác';

/** Legacy questions without skill default to vocabulary (historical quiz home). */
export const DEFAULT_QUIZ_SKILL: SkillId = 'vocabulary';

export type QuizNavQuestion = {
  index: number;
  type: string;
  skill?: string | null;
  exercise?: string | null;
};

export function isQuizType(value: string | null | undefined): value is QuizType {
  return Boolean(value && (QUIZ_TYPES as readonly string[]).includes(value));
}

export function normalizeQuizExercise(value: string | null | undefined): string {
  const trimmed = String(value || '').trim();
  return trimmed || DEFAULT_QUIZ_EXERCISE;
}

export function resolveQuizQuestionSkill(value: string | null | undefined): SkillId | null {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_QUIZ_SKILL;
  return isSkillId(raw) ? raw : null;
}

export function parseQuizTypeQuery(value: string | null | undefined): QuizType | null {
  if (!value) return null;
  return isQuizType(value) ? value : null;
}

export function filterQuizQuestions<T extends QuizNavQuestion>(
  questions: T[],
  skill: SkillId,
  type?: QuizType | null,
  exercise?: string | null
): T[] {
  return questions.filter((question) => {
    const qSkill = resolveQuizQuestionSkill(question.skill);
    if (qSkill !== skill) return false;
    if (type && question.type !== type) return false;
    if (exercise != null && exercise !== '') {
      if (normalizeQuizExercise(question.exercise) !== normalizeQuizExercise(exercise)) {
        return false;
      }
    }
    return true;
  });
}

export function quizTypesForSkill<T extends QuizNavQuestion>(
  questions: T[],
  skill: SkillId
): Array<{ type: QuizType; label: string; count: number }> {
  const skillQuestions = filterQuizQuestions(questions, skill);
  return QUIZ_TYPES.map((type) => ({
    type,
    label: QUIZ_TYPE_LABELS[type],
    count: skillQuestions.filter((q) => q.type === type).length,
  })).filter((item) => item.count > 0);
}

export function quizExercisesForSkillType<T extends QuizNavQuestion>(
  questions: T[],
  skill: SkillId,
  type: QuizType
): Array<{ exercise: string; count: number }> {
  const filtered = filterQuizQuestions(questions, skill, type);
  const counts = new Map<string, number>();
  for (const question of filtered) {
    const label = normalizeQuizExercise(question.exercise);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([exercise, count]) => ({ exercise, count }))
    .sort((a, b) => {
      if (a.exercise === DEFAULT_QUIZ_EXERCISE && b.exercise !== DEFAULT_QUIZ_EXERCISE) return 1;
      if (b.exercise === DEFAULT_QUIZ_EXERCISE && a.exercise !== DEFAULT_QUIZ_EXERCISE) return -1;
      return a.exercise.localeCompare(b.exercise, 'vi');
    });
}

export function buildQuizQuery(parts: {
  skill: SkillId;
  type?: QuizType | null;
  exercise?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set('skill', parts.skill);
  if (parts.type) params.set('type', parts.type);
  if (parts.exercise) params.set('exercise', parts.exercise);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
