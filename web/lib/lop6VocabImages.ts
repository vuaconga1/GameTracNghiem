/**
 * Conventional on-disk paths for Lớp 6 (grade 6) vocab clipart.
 *
 * Mirrors the primary (lop1-5) convention:
 *   /images/games/lop6-vocab/unit-XX/<slug>.png
 * where <slug> is the word normalized (accents stripped, lowercased, non-alnum
 * collapsed to single dashes).
 */

export const LOP6_VOCAB_IMAGES_DIR = '/images/games/lop6-vocab';

export function slugifyLop6Word(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function lop6VocabImageFileName(word: string): string {
  return `${slugifyLop6Word(word)}.png`;
}

export function lop6VocabImagePath(unit: number, word: string): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${LOP6_VOCAB_IMAGES_DIR}/${folder}/${lop6VocabImageFileName(word)}`;
}
