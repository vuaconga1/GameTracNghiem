import { slugifyLop2Word } from './lop2Vocab';

export const LOP2_VOCAB_IMAGES_DIR = '/images/games/lop2-vocab';

export function lop2VocabImageFileName(word: string): string {
  return `${slugifyLop2Word(word)}.png`;
}

export function lop2VocabImagePath(unit: number, word: string): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${LOP2_VOCAB_IMAGES_DIR}/${folder}/${lop2VocabImageFileName(word)}`;
}
