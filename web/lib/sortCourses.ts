/**
 * Natural / numeric-aware compare for course names like "Unit 2" vs "Unit 10".
 * Falls back to vi localeCompare when no digit difference.
 */
export function compareCourseNames(a: string, b: string): number {
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
}

export function sortCoursesByLevelAndName<T extends { levelName: string; name: string }>(
  items: T[]
): T[] {
  return [...items].sort((left, right) => {
    const byLevel = compareCourseNames(left.levelName, right.levelName);
    if (byLevel !== 0) return byLevel;
    return compareCourseNames(left.name, right.name);
  });
}
