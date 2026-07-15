/** Client-safe play-session helpers (no DB imports). */

/** Collapse null/empty session ids into one legacy bucket. */
export function normalizePlaySessionKey(playSessionId: string | null | undefined): string {
  const value = String(playSessionId || '').trim();
  return value || '__legacy__';
}

/**
 * Given grouped session totals, return the highest session sum.
 * Empty input → 0.
 */
export function bestSessionScoreFromGroups(
  groups: Array<{ playSessionId: string | null; points: number }>
): number {
  if (!groups.length) return 0;

  const bySession = new Map<string, number>();
  for (const group of groups) {
    const key = normalizePlaySessionKey(group.playSessionId);
    bySession.set(key, (bySession.get(key) || 0) + (Number(group.points) || 0));
  }

  let best = Number.NEGATIVE_INFINITY;
  for (const total of bySession.values()) {
    if (total > best) best = total;
  }
  return Number.isFinite(best) ? best : 0;
}

export function parseProgressCourseKey(courseKey: string): {
  courseName: string;
  levelName: string | null;
} {
  const raw = String(courseKey || '').trim();
  const sep = raw.indexOf('|');
  if (sep === -1) return { courseName: raw, levelName: null };
  return {
    courseName: raw.slice(0, sep).trim(),
    levelName: raw.slice(sep + 1).trim() || null,
  };
}

export function newPlaySessionId(): string {
  return crypto.randomUUID();
}
