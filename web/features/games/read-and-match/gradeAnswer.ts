export type ReadAndMatchGradeItem = {
  answer: string;
};

export function gradeReadAndMatchPair(matchedLabel: string, answer: string): boolean {
  return String(matchedLabel || '').trim() === String(answer || '').trim();
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
