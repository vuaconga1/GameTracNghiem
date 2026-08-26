/**
 * Conventional on-disk paths for middle-grade (Lớp 7/8/9) vocab clipart.
 *
 * Mirrors the primary (lop1-5) + Lớp 6 convention:
 *   /images/games/lop{N}-vocab/unit-XX/<slug>.png
 * where <slug> is the word normalized (accents stripped, lowercased, non-alnum
 * collapsed to single dashes).
 */

export type MiddleGrade = 7 | 8 | 9;

export function slugifyVocabWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function middleGradeVocabImagesDir(grade: MiddleGrade): string {
  return `/images/games/lop${grade}-vocab`;
}

export function middleGradeVocabImageFileName(word: string): string {
  return `${slugifyVocabWord(word)}.png`;
}

export function middleGradeVocabImagePath(
  grade: MiddleGrade,
  unit: number,
  word: string,
): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${middleGradeVocabImagesDir(grade)}/${folder}/${middleGradeVocabImageFileName(word)}`;
}
