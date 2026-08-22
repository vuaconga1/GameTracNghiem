import { foldTypedQuotes, normalizeTypedAnswer } from '../normalizeTypedAnswer';

function stripQuizHtml(value: string): string {
  return String(value || '').replace(/<[^>]+>/g, '');
}

function normalizeFillAnswer(value: string): string {
  return normalizeTypedAnswer(stripQuizHtml(value));
}

function normalizeOptionAnswer(value: string): string {
  return foldTypedQuotes(
    stripQuizHtml(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  );
}

export function gradeQuizFillAnswer(input: string, accept: string[]): boolean {
  const normalized = normalizeFillAnswer(input);
  return accept.some((answer) => normalizeFillAnswer(answer) === normalized);
}

export function gradeQuizOptionAnswer(selected: string, answer: string): boolean {
  return normalizeOptionAnswer(selected) === normalizeOptionAnswer(answer);
}
