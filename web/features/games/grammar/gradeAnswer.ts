function normalizeAnswer(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function gradeGrammarAnswer(input: string, answers: string[]): boolean {
  const normalized = normalizeAnswer(input);
  return answers.some((a) => normalizeAnswer(a) === normalized);
}
