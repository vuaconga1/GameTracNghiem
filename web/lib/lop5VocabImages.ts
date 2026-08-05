import { slugifyLop5Word } from './lop5Vocab';

export const LOP5_VOCAB_IMAGES_DIR = '/images/games/lop5-vocab';

export function lop5VocabImageFileName(word: string): string {
  return `${slugifyLop5Word(word)}.png`;
}

export function lop5VocabImagePath(unit: number, word: string): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${LOP5_VOCAB_IMAGES_DIR}/${folder}/${lop5VocabImageFileName(word)}`;
}
