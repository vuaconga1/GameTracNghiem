import { isAlphabetLevel } from '@/lib/alphabetLevel';
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
  // Alphabet is a real, explicitly-selectable level but must never be the
  // default landing level, so it is excluded from the default-pick list.
  const defaultableLevels = gradeLevelsOnly(availableLevels).filter(
    (level) => !isAlphabetLevel(level)
  );
  return resolveHomeCoursesLevel(normalized, defaultableLevels);
}
