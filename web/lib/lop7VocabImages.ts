/**
 * Conventional on-disk paths for Lớp 7 vocab clipart.
 * Thin wrapper over the shared middle-grade helper.
 *   /images/games/lop7-vocab/unit-XX/<slug>.png
 */
import {
  middleGradeVocabImageFileName,
  middleGradeVocabImagePath,
  middleGradeVocabImagesDir,
  slugifyVocabWord,
} from './middleGradeVocabImages';

export const LOP7_VOCAB_IMAGES_DIR = middleGradeVocabImagesDir(7);

export const slugifyLop7Word = slugifyVocabWord;
export const lop7VocabImageFileName = middleGradeVocabImageFileName;

export function lop7VocabImagePath(unit: number, word: string): string {
  return middleGradeVocabImagePath(7, unit, word);
}
