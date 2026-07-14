export function normalizeWord(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export type LookAndWriteGradeItem = {
  answer: string;
};

export function gradeLookAndWriteItem(placed: string, answer: string): boolean {
  return normalizeWord(placed) === normalizeWord(answer);
}

export function gradeLookAndWriteExercise(
  placements: Record<number, string>,
  items: LookAndWriteGradeItem[]
): { isCorrect: boolean; itemResults: boolean[] } {
  const itemResults = items.map((item, index) =>
    gradeLookAndWriteItem(placements[index] || '', item.answer)
  );
  const isCorrect =
    items.length > 0 && itemResults.length === items.length && itemResults.every(Boolean);
  return { isCorrect, itemResults };
}
