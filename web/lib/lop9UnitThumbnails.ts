import { LOP9_UNIT_COUNT } from './lop9Units';

export const LOP9_UNIT_IMAGES_DIR = '/images/courses/lop9';

export function lop9UnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.webp`;
}

export function lop9UnitImagePath(unit: number): string {
  return `${LOP9_UNIT_IMAGES_DIR}/${lop9UnitImageFileName(unit)}`;
}

export function allLop9UnitImagePaths(): string[] {
  return Array.from({ length: LOP9_UNIT_COUNT }, (_, index) => lop9UnitImagePath(index + 1));
}
