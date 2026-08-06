import type { ProgressStatus } from '@/lib/gameCatalog';
import { newPlaySessionId } from '@/lib/playSession';
import { persistGuestGameProgress } from '@/lib/player/guestPlayerAdapter';
import type { PlayerDescriptor } from '@/lib/player/types';

export type PersistProgressResult = {
  success: boolean;
  statuses?: ProgressStatus[];
  playSessionId?: string | null;
  message?: string;
};

export async function persistGameProgress(params: {
  courseKey: string;
  game: string;
  statuses: ProgressStatus[];
  reset?: boolean;
  playSessionId?: string | null;
  player?: PlayerDescriptor;
}): Promise<PersistProgressResult> {
  if (params.player?.kind === 'guest') {
    const result = persistGuestGameProgress(params);
    return {
      success: true,
      statuses: result.statuses,
      playSessionId: result.playSessionId,
    };
  }

  const res = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseKey: params.courseKey,
      game: params.game,
      statuses: params.statuses,
      reset: Boolean(params.reset),
      playSessionId: params.playSessionId || undefined,
    }),
  });
  return res.json();
}

export function createPlaySessionId(): string {
  return newPlaySessionId();
}
