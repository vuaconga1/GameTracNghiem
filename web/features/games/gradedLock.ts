import type { ProgressStatus } from '@/lib/gameCatalog';

/** Once graded, the item stays view-only until the student resets the whole game. */
export function isGradedStatus(status: ProgressStatus | undefined): boolean {
  return status === 'correct' || status === 'wrong';
}

export function gradedIsCorrect(status: ProgressStatus | undefined): boolean {
  return status === 'correct';
}
