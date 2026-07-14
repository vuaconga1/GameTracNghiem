export function normalizeWord(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export type ChooseAndCircleGradeItem = {
  answer: string;
};

export function gradeChooseAndCircleItem(pick: string, answer: string): boolean {
  return normalizeWord(pick) === normalizeWord(answer);
}

export function gradeChooseAndCircleExercise(
  picks: Record<number, string>,
  items: ChooseAndCircleGradeItem[]
): { isCorrect: boolean; itemResults: boolean[] } {
  const itemResults = items.map((item, index) =>
    gradeChooseAndCircleItem(picks[index] || '', item.answer)
  );
  const isCorrect =
    items.length > 0 && itemResults.length === items.length && itemResults.every(Boolean);
  return { isCorrect, itemResults };
}
