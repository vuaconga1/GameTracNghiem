export const HOME_COURSES_LEVEL_STORAGE_KEY = 'wewin:courses:selected-level';
/** Readable by the home RSC so localStorage preference matches first paint. */
export const HOME_COURSES_LEVEL_COOKIE = 'wewin_courses_level';
const HOME_COURSES_LEVEL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeHomeCoursesLevelName(value: string | null | undefined): string {
  return String(value || '').trim();
}

/** Client-only: keep cookie in sync with localStorage for SSR. */
export function persistHomeCoursesLevelPreference(levelName: string) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeHomeCoursesLevelName(levelName);
  if (normalized) {
    window.localStorage.setItem(HOME_COURSES_LEVEL_STORAGE_KEY, normalized);
    document.cookie = `${HOME_COURSES_LEVEL_COOKIE}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${HOME_COURSES_LEVEL_COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(HOME_COURSES_LEVEL_STORAGE_KEY);
    document.cookie = `${HOME_COURSES_LEVEL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function readHomeCoursesLevelParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeHomeCoursesLevelName(raw);
}

export function buildHomeCoursesHref(
  pathname: string,
  currentSearch: string | URLSearchParams,
  levelName: string
): string {
  const params = new URLSearchParams(
    typeof currentSearch === 'string' ? currentSearch : currentSearch.toString()
  );
  const normalizedLevelName = normalizeHomeCoursesLevelName(levelName);

  if (normalizedLevelName) {
    params.set('levelName', normalizedLevelName);
  } else {
    params.delete('levelName');
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function readHomeCoursesLevelFromSearch(search: string | URLSearchParams): string {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return normalizeHomeCoursesLevelName(params.get('levelName'));
}

/** Client-only: URL wins, then localStorage, then server default. */
export function resolveClientHomeCoursesLevel(options: {
  urlLevelName: string;
  storedLevelName: string;
  serverLevelName: string;
}): string {
  if (options.urlLevelName) return options.urlLevelName;
  if (options.storedLevelName) return options.storedLevelName;
  return normalizeHomeCoursesLevelName(options.serverLevelName);
}

export function currentBrowserHref(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}`;
}
