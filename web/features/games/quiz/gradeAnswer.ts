function normalizeAnswer(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function gradeQuizFillAnswer(input: string, accept: string[]): boolean {
  const normalized = normalizeAnswer(input);
  return accept.some((answer) => normalizeAnswer(answer) === normalized);
}

export function gradeQuizOptionAnswer(selected: string, answer: string): boolean {
  return normalizeAnswer(selected) === normalizeAnswer(answer);
}
