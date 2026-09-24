type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 60_000;

export function peekClientFetchCache<T>(key: string): T | undefined {
  const hit = memoryCache.get(key);
  if (!hit || hit.expiresAt <= Date.now()) return undefined;
  return hit.data as T;
}

export function seedClientFetchCache(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS) {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateClientFetchCache(prefixOrKey?: string) {
  if (!prefixOrKey) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * In-memory GET JSON cache for client navigations.
 * Same URL within TTL returns cached data; concurrent non-abortable callers share one request.
 */
export async function cachedJsonFetch<T>(
  url: string,
  options?: {
    ttlMs?: number;
    signal?: AbortSignal;
    bypass?: boolean;
  },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  if (!options?.bypass) {
    const hit = peekClientFetchCache<T>(url);
    if (hit !== undefined) return hit;
  }

  async function runFetch(): Promise<T> {
    const res = await fetch(url, { signal: options?.signal });
    const data = (await res.json()) as T;
    if (res.ok) {
      seedClientFetchCache(url, data, ttlMs);
    }
    return data;
  }

  // Abortable callers must not share inflight — an aborted request would poison others.
  if (options?.signal) {
    return runFetch();
  }

  const existing = inflight.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = runFetch();
  inflight.set(url, request);
  try {
    return await request;
  } finally {
    inflight.delete(url);
  }
}
