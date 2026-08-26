/**
 * Conventional on-disk paths for Lớp 9 vocab clipart.
 * Thin wrapper over the shared middle-grade helper.
 *   /images/games/lop9-vocab/unit-XX/<slug>.png
 */
import {
  middleGradeVocabImageFileName,
  middleGradeVocabImagePath,
  middleGradeVocabImagesDir,
  slugifyVocabWord,
} from './middleGradeVocabImages';

export const LOP9_VOCAB_IMAGES_DIR = middleGradeVocabImagesDir(9);

export const slugifyLop9Word = slugifyVocabWord;
export const lop9VocabImageFileName = middleGradeVocabImageFileName;

export function lop9VocabImagePath(unit: number, word: string): string {
  return middleGradeVocabImagePath(9, unit, word);
}
