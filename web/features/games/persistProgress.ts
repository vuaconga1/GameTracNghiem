import type { ProgressStatus } from '@/lib/gameCatalog';
import { newPlaySessionId } from '@/lib/playSession';

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
}): Promise<PersistProgressResult> {
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
