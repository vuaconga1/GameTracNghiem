import { normalizeTypedAnswer } from '../normalizeTypedAnswer';

export function normalizeScrambleAnswer(value: string): string {
  return normalizeTypedAnswer(value).replace(/\s+/g, '');
}

export function gradeScrambleAnswer(userAnswer: string, word: string): boolean {
  return normalizeScrambleAnswer(userAnswer) === normalizeScrambleAnswer(word);
}
