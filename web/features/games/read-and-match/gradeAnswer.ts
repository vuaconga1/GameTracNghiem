export type ReadAndMatchGradeItem = {
  answer: string;
};

function normalizeAnswer(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Compare the English answer keys of the paired sentence and image (labels may be Vietnamese). */
export function gradeReadAndMatchPair(matchedAnswer: string, answer: string): boolean {
  return normalizeAnswer(matchedAnswer) === normalizeAnswer(answer);
}

export function gradeReadAndMatchExercise(
  matches: Record<number, { correct: boolean } | undefined>,
  items: ReadAndMatchGradeItem[]
): { isCorrect: boolean; itemResults: boolean[] } {
  const itemResults = items.map((item, index) => {
    const match = matches[index];
    if (!match) return false;
    return match.correct;
  });
  const isCorrect =
    items.length > 0 && itemResults.length === items.length && itemResults.every(Boolean);
  return { isCorrect, itemResults };
}
