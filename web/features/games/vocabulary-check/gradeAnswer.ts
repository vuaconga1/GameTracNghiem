export type VocabularyCheckGradeItem = {
  is_correct: boolean;
};

export function gradeVocabularyCheckItem(
  userSaysCorrect: boolean | undefined,
  isCorrect: boolean
): boolean {
  if (userSaysCorrect === undefined) return false;
  return userSaysCorrect === Boolean(isCorrect);
}

export function gradeVocabularyCheckExercise(
  picks: Record<number, boolean>,
  items: VocabularyCheckGradeItem[]
): { isCorrect: boolean; itemResults: boolean[] } {
  const itemResults = items.map((item, index) =>
    gradeVocabularyCheckItem(picks[index], item.is_correct)
  );
  const isCorrect =
    items.length > 0 && itemResults.length === items.length && itemResults.every(Boolean);
  return { isCorrect, itemResults };
}
