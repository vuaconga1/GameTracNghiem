export type SubmitScoreResult = {
  success: boolean;
  points?: number;
  isCorrect?: boolean;
  courseScore?: number;
  gameScore?: number;
  playSessionId?: string | null;
  message?: string;
};

export async function submitAnswerScore(
  course: string,
  game: string,
  questionIndex: number,
  isCorrect: boolean,
  elapsedMs: number,
  playSessionId?: string | null
): Promise<SubmitScoreResult> {
  const res = await fetch('/api/score/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course,
      game,
      questionIndex,
      isCorrect,
      elapsedMs,
      playSessionId: playSessionId || undefined,
    }),
  });
  return res.json();
}
