export function resolveHomeCoursesLevel(
  requestedLevelName: string,
  availableLevels: string[]
): string {
  const normalizedRequestedLevelName = String(requestedLevelName || '').trim();
  if (normalizedRequestedLevelName) return normalizedRequestedLevelName;
  return availableLevels[0] || '';
}
