/** Default pause after scoring before moving to the next question/exercise. */
export const AUTO_ADVANCE_MS = 10_000;

export type AdvanceTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

export function clearAutoAdvance(timerRef: AdvanceTimerRef): void {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

/** Schedule next question; clicking Next should call clearAutoAdvance first. */
export function scheduleAutoAdvance(
  timerRef: AdvanceTimerRef,
  onAdvance: () => void,
  delayMs: number = AUTO_ADVANCE_MS
): void {
  clearAutoAdvance(timerRef);
  timerRef.current = setTimeout(() => {
    timerRef.current = null;
    onAdvance();
  }, delayMs);
}
