/**
 * Convention-based vocab clipart resolution shared by all grade levels.
 *
 * Every grade (Lớp 1–9) stores clipart under the same on-disk convention:
 *   /images/games/lop{N}-vocab/unit-XX/<slug>.png
 * where <slug> is the word normalized (accents stripped, lowercased, non-alnum
 * collapsed to single dashes) — identical to the per-grade helpers.
 *
 * This resolver derives the path purely from course metadata + the word, so
 * games can show a picture without any DB wiring. Callers should still render
 * the resulting URL with an onError fallback: a resolved path is not a promise
 * that the file exists (e.g. grades still being generated).
 */
import { parseUnitNumber } from '@/lib/primaryGradeConfig';

const VOCAB_IMAGES_ROOT = '/images/games';

export function slugifyVocabWord(word: string): string {
  return String(word || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Parse the grade number (1–9) from a Vietnamese level name like "Lớp 6". */
export function gradeFromLevelName(levelName: string): number | null {
  const match = /Lớp\s*(\d+)/i.exec(String(levelName || '').trim());
  if (!match) return null;
  const grade = Number(match[1]);
  return Number.isInteger(grade) && grade >= 1 && grade <= 9 ? grade : null;
}

export function vocabImagePathForGrade(
  grade: number,
  unit: number,
  word: string,
): string | null {
  const slug = slugifyVocabWord(word);
  if (!slug) return null;
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${VOCAB_IMAGES_ROOT}/lop${grade}-vocab/${folder}/${slug}.png`;
}

/**
 * Resolve the conventional vocab image path for a single word within a course,
 * or null when the course is not a grade/unit vocab course (e.g. logistics) or
 * the word is empty. Never touches the filesystem — verify client-side.
 */
export function resolveCourseVocabImagePath(input: {
  levelName: string;
  courseName: string;
  word: string;
}): string | null {
  const grade = gradeFromLevelName(input.levelName);
  if (!grade) return null;
  const unit = parseUnitNumber(input.courseName);
  if (!unit) return null;
  return vocabImagePathForGrade(grade, unit, input.word);
}
