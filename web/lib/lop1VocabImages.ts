import { slugifyLop1Word } from './lop1Vocab';

export const LOP1_VOCAB_IMAGES_DIR = '/images/games/lop1-vocab';

export function lop1VocabImageFileName(word: string): string {
  return `${slugifyLop1Word(word)}.png`;
}

export function lop1VocabImagePath(unit: number, word: string): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${LOP1_VOCAB_IMAGES_DIR}/${folder}/${lop1VocabImageFileName(word)}`;
}
