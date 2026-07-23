export const HOME_COURSES_LEVEL_STORAGE_KEY = 'wewin:courses:selected-level';

export function normalizeHomeCoursesLevelName(value: string | null | undefined): string {
  return String(value || '').trim();
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
