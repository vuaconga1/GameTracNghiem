const HOME_TOUR_DONE_KEY = 'wewin.tour.home.v1.done';

export function isHomeTourDone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(HOME_TOUR_DONE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markHomeTourDone(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HOME_TOUR_DONE_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearHomeTourDone(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HOME_TOUR_DONE_KEY);
  } catch {
    // ignore
  }
}
