export function normalizeWord(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export type ReadAndCompleteGradeItem = {
  answer: string;
};

export function gradeReadAndCompleteItem(placed: string, answer: string): boolean {
  return normalizeWord(placed) === normalizeWord(answer);
}

export function gradeReadAndCompleteExercise(
  placements: Record<number, string>,
  items: ReadAndCompleteGradeItem[]
): { isCorrect: boolean; itemResults: boolean[] } {
  const itemResults = items.map((item, index) =>
    gradeReadAndCompleteItem(placements[index] || '', item.answer)
  );
  const isCorrect =
    items.length > 0 && itemResults.length === items.length && itemResults.every(Boolean);
  return { isCorrect, itemResults };
}
