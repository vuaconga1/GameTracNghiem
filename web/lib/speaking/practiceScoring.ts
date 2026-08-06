import { calculatePoints } from '@/lib/scoring';

/** A drill assessment of 70/100 or higher counts as correct practice. */
export const SPEAKING_DRILL_CORRECT_THRESHOLD = 70;

/** Realtime practice must include at least 30 server-timed seconds. */
export const MIN_REALTIME_PARTICIPATION_MS = 30_000;
export const REALTIME_POINTS_INTERVAL_MS = 30_000;
export const REALTIME_POINTS_PER_INTERVAL = 10;
export const REALTIME_MAX_POINTS = 100;

function safeElapsedMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(2_147_483_647, Math.max(0, Math.round(value)));
}

export function speakingDrillPracticeScore(
  assessmentScore: number,
  validatedAudioDurationMs: number,
) {
  const score = Math.max(0, Math.min(100, Math.round(assessmentScore)));
  const elapsedMs = safeElapsedMs(validatedAudioDurationMs);
  const isCorrect = score >= SPEAKING_DRILL_CORRECT_THRESHOLD;
  return {
    score,
    isCorrect,
    elapsedMs,
    points: calculatePoints(isCorrect, elapsedMs),
  };
}

/**
 * Realtime practice earns 10 leaderboard points per completed 30 seconds,
 * capped at 100. The server's startedAt/endedAt timestamps are authoritative.
 */
export function realtimeSpeakingPracticeScore(startedAt: Date, endedAt: Date) {
  const elapsedMs = safeElapsedMs(endedAt.getTime() - startedAt.getTime());
  const eligible = elapsedMs >= MIN_REALTIME_PARTICIPATION_MS;
  return {
    eligible,
    elapsedMs,
    points: eligible
      ? Math.min(
          REALTIME_MAX_POINTS,
          Math.floor(elapsedMs / REALTIME_POINTS_INTERVAL_MS) *
            REALTIME_POINTS_PER_INTERVAL,
        )
      : 0,
  };
}
