import { slugifyLop4Word } from './lop4Vocab';

export const LOP4_VOCAB_IMAGES_DIR = '/images/games/lop4-vocab';

export function lop4VocabImageFileName(word: string): string {
  return `${slugifyLop4Word(word)}.png`;
}

export function lop4VocabImagePath(unit: number, word: string): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${LOP4_VOCAB_IMAGES_DIR}/${folder}/${lop4VocabImageFileName(word)}`;
}
