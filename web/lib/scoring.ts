export const SCORING = {
  TIME_LIMIT_MS: 30_000,
  CORRECT_MIN: 50,
  CORRECT_MAX: 200,
  WRONG_MIN: 20,
  WRONG_MAX: 80,
} as const;

/** Port of GAS calculatePoints_ — wrong answers return negative points. */
export function calculatePoints(isCorrect: boolean, elapsedMs: number): number {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  let speedRatio = 1 - elapsed / SCORING.TIME_LIMIT_MS;
  if (speedRatio < 0) speedRatio = 0;
  if (speedRatio > 1) speedRatio = 1;

  if (isCorrect) {
    return Math.round(
      SCORING.CORRECT_MIN + (SCORING.CORRECT_MAX - SCORING.CORRECT_MIN) * speedRatio
    );
  }
  return -Math.round(
    SCORING.WRONG_MIN + (SCORING.WRONG_MAX - SCORING.WRONG_MIN) * (1 - speedRatio)
  );
}
