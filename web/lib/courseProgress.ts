type CourseCompletionInput = {
  enabledGames: string[];
  questionCounts: Record<string, number>;
  progress: Record<string, unknown>;
};

function answeredCount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((status) => status === 'correct' || status === 'wrong').length;
}

export function courseCompletionPercent({
  enabledGames,
  questionCounts,
  progress,
}: CourseCompletionInput): number {
  let answered = 0;
  let total = 0;

  for (const game of enabledGames) {
    const questionCount = Math.max(0, Math.floor(questionCounts[game] || 0));
    total += questionCount;
    answered += Math.min(questionCount, answeredCount(progress[game]));
  }

  if (total === 0) return 0;
  return Math.min(100, Math.round((answered / total) * 100));
}
