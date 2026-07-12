export function gradeGrammarAnswer(input: string, answers: string[]): boolean {
  const normalized = String(input || '').trim().toLowerCase();
  return answers.some((a) => String(a).trim().toLowerCase() === normalized);
}
