/**
 * "Bảng chữ cái" (Alphabet) — a virtual home level that sits next to Lớp 1–9.
 *
 * It is backed by durable Course rows (one per letter A–Z) whose pronunciation
 * questions are built from the distinct English vocabulary already stored across
 * every grade. Scoring flows through the normal pronunciation game path, so the
 * leaderboard keeps working. Unlike logistics, this level is a WewinStudent
 * level (non-logistics), so the existing role helpers already grant access.
 */

export const ALPHABET_LEVEL = 'Bảng chữ cái';

export const ALPHABET_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function isAlphabetLevel(levelName: string | null | undefined): boolean {
  return String(levelName || '').trim() === ALPHABET_LEVEL;
}

/** Course id pattern for letter courses, e.g. "alphabet-a". */
export function isAlphabetCourseId(courseId: string | null | undefined): boolean {
  return /^alphabet-[a-z]$/i.test(String(courseId || '').trim());
}

/** Alphabet letter course (by level name and/or stable course id). */
export function isAlphabetCourse(
  courseId: string | null | undefined,
  levelName?: string | null | undefined,
): boolean {
  return isAlphabetLevel(levelName) || isAlphabetCourseId(courseId);
}

/** Stable course id for a letter, e.g. "A" → "alphabet-a". */
export function alphabetCourseId(letter: string): string {
  return `alphabet-${letter.toLowerCase()}`;
}

/** Display name / letter badge, e.g. "A" → "Aa". */
export function alphabetCourseName(letter: string): string {
  const upper = letter.toUpperCase().charAt(0);
  return `${upper}${upper.toLowerCase()}`;
}

/** Uppercase letter derived from a course whose name is like "Aa". */
export function alphabetLetterFromCourseName(courseName: string): string {
  return String(courseName || '').trim().charAt(0).toUpperCase();
}

/**
 * The A–Z bucket for a vocab word (accent-insensitive), or null when the word
 * does not start with an English letter.
 */
export function alphabetLetterForWord(word: string): string | null {
  const cleaned = String(word || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const first = cleaned.charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : null;
}

/** Keep grade levels in their existing order but push special levels to the end. */
export function orderHomeCourseLevels(levels: string[]): string[] {
  const specials = levels.filter((level) => isAlphabetLevel(level));
  const rest = levels.filter((level) => !isAlphabetLevel(level));
  return [...rest, ...specials];
}
