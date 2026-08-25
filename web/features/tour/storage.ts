const HOME_TOUR_DONE_KEY = 'wewin.tour.home.v1.done';

/** Storage keys for every page-level tour. Game tours use `gameTourDoneKey`. */
export const TOUR_KEYS = {
  home: HOME_TOUR_DONE_KEY,
  course: 'wewin.tour.course.v1.done',
  leaderboard: 'wewin.tour.leaderboard.v1.done',
  speakingHub: 'wewin.tour.speakingHub.v1.done',
  logistics: 'wewin.tour.logistics.v1.done',
} as const;

/** Per-game done flag, e.g. `wewin.tour.game.grammar.v1.done`. */
export function gameTourDoneKey(gameKey: string): string {
  return `wewin.tour.game.${gameKey}.v1.done`;
}

export function isTourDone(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return true;
  }
}

export function markTourDone(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearTourDone(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function isHomeTourDone(): boolean {
  return isTourDone(HOME_TOUR_DONE_KEY);
}

export function markHomeTourDone(): void {
  markTourDone(HOME_TOUR_DONE_KEY);
}

export function clearHomeTourDone(): void {
  clearTourDone(HOME_TOUR_DONE_KEY);
}
