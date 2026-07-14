export function progressCourseKey(courseName: string, level?: string | null): string {
  const name = String(courseName || '').trim();
  const lvl = String(level || '').trim();
  return lvl ? `${name}|${lvl}` : name;
}

/** Keys that may appear in ScoreLog.course (legacy name-only vs progress key). */
export function scoreLookupCourseKeys(courseName: string, level?: string | null): string[] {
  const name = String(courseName || '').trim();
  if (!name) return [];
  const key = progressCourseKey(name, level);
  return key === name ? [name] : [key, name];
}
