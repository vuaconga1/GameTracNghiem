/**
 * Conventional on-disk paths for Lớp 8 vocab clipart.
 * Thin wrapper over the shared middle-grade helper.
 *   /images/games/lop8-vocab/unit-XX/<slug>.png
 */
import {
  middleGradeVocabImageFileName,
  middleGradeVocabImagePath,
  middleGradeVocabImagesDir,
  slugifyVocabWord,
} from './middleGradeVocabImages';

export const LOP8_VOCAB_IMAGES_DIR = middleGradeVocabImagesDir(8);

export const slugifyLop8Word = slugifyVocabWord;
export const lop8VocabImageFileName = middleGradeVocabImageFileName;

export function lop8VocabImagePath(unit: number, word: string): string {
  return middleGradeVocabImagePath(8, unit, word);
}
