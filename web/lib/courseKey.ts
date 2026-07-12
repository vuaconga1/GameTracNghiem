export function progressCourseKey(courseName: string, level?: string | null): string {
  const name = String(courseName || '').trim();
  const lvl = String(level || '').trim();
  return lvl ? `${name}|${lvl}` : name;
}
