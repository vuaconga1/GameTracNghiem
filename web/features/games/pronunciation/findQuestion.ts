import type { PronunciationMode, PronunciationQuestion } from './types';

const HIDDEN_MODES = new Set(['stress']);

export function uniqueModes(questions: PronunciationQuestion[]): PronunciationMode[] {
  const seen = new Set<string>();
  const modes: PronunciationMode[] = [];
  for (const question of questions) {
    const mode = question.mode || 'phoneme';
    if (!seen.has(mode)) {
      seen.add(mode);
      modes.push(mode);
    }
  }
  return modes;
}

/** Modes shown in the player (stress hidden until auto-scoring exists). */
export function playableModes(questions: PronunciationQuestion[]): PronunciationMode[] {
  return uniqueModes(questions).filter((mode) => !HIDDEN_MODES.has(String(mode)));
}

export function findFirstQuestionByMode(
  questions: PronunciationQuestion[],
  mode: PronunciationMode
): number {
  for (let index = 0; index < questions.length; index += 1) {
    if (questions[index].mode === mode) return index;
  }
  return 0;
}

export function nextQuestionIndexInMode(
  questions: PronunciationQuestion[],
  currentIndex: number,
  mode: PronunciationMode
): number {
  for (let index = currentIndex + 1; index < questions.length; index += 1) {
    if (questions[index].mode === mode) return index;
  }
  for (let index = 0; index < questions.length; index += 1) {
    if (questions[index].mode === mode) return index;
  }
  return currentIndex;
}

function isPlayableQuestion(question: PronunciationQuestion, modes: PronunciationMode[]): boolean {
  return modes.includes(question.mode || 'phoneme');
}

/** First unanswered playable question, or -1 when all playable are graded. */
export function nextEmptyPlayableIndex(
  questions: PronunciationQuestion[],
  statuses: readonly string[]
): number {
  const modes = playableModes(questions);
  for (let index = 0; index < questions.length; index += 1) {
    if (isPlayableQuestion(questions[index], modes) && statuses[index] === 'empty') {
      return index;
    }
  }
  return -1;
}

/** Next playable question after currentIndex, or -1 at end of list. */
export function nextPlayableIndex(
  questions: PronunciationQuestion[],
  currentIndex: number
): number {
  const modes = playableModes(questions);
  for (let index = currentIndex + 1; index < questions.length; index += 1) {
    if (isPlayableQuestion(questions[index], modes)) return index;
  }
  return -1;
}

export function playableQuestionEntries(questions: PronunciationQuestion[]) {
  const modes = playableModes(questions);
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => isPlayableQuestion(question, modes));
}
