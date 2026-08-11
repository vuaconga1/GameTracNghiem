import { isLogisticsLevel, LOGISTICS_LEVEL } from '@/lib/logisticsUnits';

export function resolveHomeCoursesLevel(
  requestedLevelName: string,
  availableLevels: string[]
): string {
  const normalizedRequestedLevelName = String(requestedLevelName || '').trim();
  if (normalizedRequestedLevelName) return normalizedRequestedLevelName;
  return availableLevels[0] || '';
}

export function gradeLevelsOnly(levels: string[]): string[] {
  return levels.filter((level) => !isLogisticsLevel(level));
}

export function resolveSelectedHomeLevel(
  requestedLevelName: string,
  availableLevels: string[]
): string {
  const normalized = String(requestedLevelName || '').trim();
  if (isLogisticsLevel(normalized)) {
    return availableLevels.find((level) => isLogisticsLevel(level)) || LOGISTICS_LEVEL;
  }
  return resolveHomeCoursesLevel(normalized, gradeLevelsOnly(availableLevels));
}
