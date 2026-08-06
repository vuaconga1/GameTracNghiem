import type { ProgressStatus } from '@/lib/gameCatalog';
import type { PlayerDescriptor } from '@/lib/player/types';
import { calculatePoints } from '@/lib/scoring';

const STORAGE_PREFIX = 'wewin:guest-player:v1';

type GuestGameState = {
  statuses: ProgressStatus[];
  playSessionId: string | null;
  gameScore: number;
  totalScore: number;
  sessionScores: Record<string, number>;
};

export type HydratedGamePlayerState = {
  statuses: ProgressStatus[];
  playSessionId: string | null;
  gameScore: number;
};

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(courseKey: string, game: string): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(courseKey)}:${encodeURIComponent(game)}`;
}

function normalizeStatus(value: unknown): ProgressStatus {
  return value === 'correct' || value === 'wrong' ? value : 'empty';
}

function emptyState(): GuestGameState {
  return {
    statuses: [],
    playSessionId: null,
    gameScore: 0,
    totalScore: 0,
    sessionScores: {},
  };
}

export function readGuestGameState(
  courseKey: string,
  game: string,
  storage: Storage | null = browserStorage(),
): GuestGameState {
  if (!storage) return emptyState();
  try {
    const value = JSON.parse(storage.getItem(storageKey(courseKey, game)) || 'null') as
      | Partial<GuestGameState>
      | null;
    if (!value || typeof value !== 'object') return emptyState();
    const sessionScores =
      value.sessionScores && typeof value.sessionScores === 'object'
        ? Object.fromEntries(
            Object.entries(value.sessionScores)
              .filter(([, score]) => Number.isFinite(Number(score)))
              .map(([id, score]) => [id, Number(score)]),
          )
        : {};
    return {
      statuses: Array.isArray(value.statuses) ? value.statuses.map(normalizeStatus) : [],
      playSessionId:
        typeof value.playSessionId === 'string' && value.playSessionId.trim()
          ? value.playSessionId
          : null,
      gameScore: Number.isFinite(Number(value.gameScore)) ? Number(value.gameScore) : 0,
      totalScore: Number.isFinite(Number(value.totalScore)) ? Number(value.totalScore) : 0,
      sessionScores,
    };
  } catch {
    return emptyState();
  }
}

function writeGuestGameState(
  courseKey: string,
  game: string,
  state: GuestGameState,
  storage: Storage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(storageKey(courseKey, game), JSON.stringify(state));
  } catch {
    // Browser privacy/quota failures keep the current session usable in memory.
  }
}

function mergeStatuses(
  existing: ProgressStatus[],
  incoming: ProgressStatus[],
): ProgressStatus[] {
  const length = Math.max(existing.length, incoming.length);
  return Array.from({ length }, (_, index) => {
    const next = normalizeStatus(incoming[index]);
    return next !== 'empty' ? next : normalizeStatus(existing[index]);
  });
}

export function hydrateGamePlayerState(input: {
  player: PlayerDescriptor;
  courseKey: string;
  game: string;
  statuses?: ProgressStatus[];
  playSessionId?: string | null;
  gameScore?: number;
  storage?: Storage | null;
}): HydratedGamePlayerState {
  if (input.player.kind === 'authenticated') {
    return {
      statuses: input.statuses || [],
      playSessionId: input.playSessionId || null,
      gameScore: input.gameScore || 0,
    };
  }
  const local = readGuestGameState(input.courseKey, input.game, input.storage);
  return {
    statuses: local.statuses,
    playSessionId: local.playSessionId,
    gameScore: local.gameScore,
  };
}

export function persistGuestGameProgress(input: {
  courseKey: string;
  game: string;
  statuses: ProgressStatus[];
  reset?: boolean;
  playSessionId?: string | null;
  storage?: Storage | null;
}): HydratedGamePlayerState {
  const previous = readGuestGameState(input.courseKey, input.game, input.storage);
  const statuses = input.reset
    ? input.statuses.map(normalizeStatus)
    : mergeStatuses(previous.statuses, input.statuses);
  const next = {
    ...previous,
    statuses,
    playSessionId: input.playSessionId || previous.playSessionId || null,
  };
  writeGuestGameState(input.courseKey, input.game, next, input.storage);
  return {
    statuses: next.statuses,
    playSessionId: next.playSessionId,
    gameScore: next.gameScore,
  };
}

export function submitGuestAnswerScore(input: {
  courseKey: string;
  game: string;
  isCorrect: boolean;
  elapsedMs: number;
  playSessionId?: string | null;
  storage?: Storage | null;
}) {
  const points = calculatePoints(input.isCorrect, input.elapsedMs);
  const previous = readGuestGameState(input.courseKey, input.game, input.storage);
  const sessionId = input.playSessionId || previous.playSessionId || 'current';
  const sessionScore = (previous.sessionScores[sessionId] || 0) + points;
  const sessionScores = { ...previous.sessionScores, [sessionId]: sessionScore };
  const gameScore = Math.max(0, ...Object.values(sessionScores));
  const next: GuestGameState = {
    ...previous,
    playSessionId: sessionId,
    gameScore,
    totalScore: previous.totalScore + points,
    sessionScores,
  };
  writeGuestGameState(input.courseKey, input.game, next, input.storage);
  return {
    success: true,
    points,
    isCorrect: input.isCorrect,
    courseScore: next.totalScore,
    gameScore,
    playSessionId: sessionId,
  };
}

export function guestCourseScore(
  courseKey: string,
  games: string[],
  storage: Storage | null = browserStorage(),
): number {
  return games.reduce(
    (total, game) => total + readGuestGameState(courseKey, game, storage).totalScore,
    0,
  );
}
