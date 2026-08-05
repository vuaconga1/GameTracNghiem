import { slugifyLop3Word } from './lop3Vocab';

export const LOP3_VOCAB_IMAGES_DIR = '/images/games/lop3-vocab';

export function lop3VocabImageFileName(word: string): string {
  return `${slugifyLop3Word(word)}.png`;
}

export function lop3VocabImagePath(unit: number, word: string): string {
  const folder = `unit-${String(unit).padStart(2, '0')}`;
  return `${LOP3_VOCAB_IMAGES_DIR}/${folder}/${lop3VocabImageFileName(word)}`;
}
