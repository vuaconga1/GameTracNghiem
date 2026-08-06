import type { PlayerDescriptor } from '@/lib/player/types';

export type CompleteSessionResult = {
  success: boolean;
  alreadyGranted?: boolean;
  grant?: {
    playSessionId: string;
    exp: number;
    answeredCount: number;
    correctCount: number;
  };
  profile?: {
    level: number;
    tier: number;
    totalExp: number;
    expInLevel: number;
    expToNextLevel: number | null;
    progressPercent: number;
  };
  message?: string;
};

/** Grant EXP for a finished play session (idempotent). */
export async function completePlaySessionExperience(
  playSessionId: string | null | undefined,
  player?: PlayerDescriptor,
): Promise<CompleteSessionResult | null> {
  if (player?.kind === 'guest') return null;
  const id = String(playSessionId || '').trim();
  if (!id) return null;

  const res = await fetch('/api/experience/sessions/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playSessionId: id }),
  });
  return res.json();
}

export function isSubsetFullyGraded(
  questionIndexes: number[],
  statuses: Array<'empty' | 'correct' | 'wrong'>
): boolean {
  if (questionIndexes.length === 0) return false;
  return questionIndexes.every((index) => {
    const status = statuses[index];
    return status === 'correct' || status === 'wrong';
  });
}

export function isStatusesFullyGraded(
  statuses: Array<'empty' | 'correct' | 'wrong'>
): boolean {
  return (
    statuses.length > 0 &&
    statuses.every((status) => status === 'correct' || status === 'wrong')
  );
}

/**
 * Idempotent EXP close when the played set is fully graded.
 * Returns null when the set is still incomplete. Callers should refresh the
 * shell badge when the result is non-null (including alreadyGranted).
 */
export async function finalizePlaySessionIfComplete(params: {
  statuses: Array<'empty' | 'correct' | 'wrong'>;
  playSessionId?: string | null;
  indexes?: number[];
  player?: PlayerDescriptor;
}): Promise<CompleteSessionResult | null> {
  const done = params.indexes
    ? isSubsetFullyGraded(params.indexes, params.statuses)
    : isStatusesFullyGraded(params.statuses);
  if (!done) return null;
  return completePlaySessionExperience(params.playSessionId, params.player);
}
