export function normalizeScrambleAnswer(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function gradeScrambleAnswer(userAnswer: string, word: string): boolean {
  return normalizeScrambleAnswer(userAnswer) === normalizeScrambleAnswer(word);
}
