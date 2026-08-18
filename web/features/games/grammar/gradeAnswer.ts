import { normalizeTypedAnswer } from '../normalizeTypedAnswer';

export function gradeGrammarAnswer(input: string, answers: string[]): boolean {
  const normalized = normalizeTypedAnswer(input);
  return answers.some((a) => normalizeTypedAnswer(a) === normalized);
}
