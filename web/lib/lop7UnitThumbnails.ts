import { LOP7_UNIT_COUNT } from './lop7Units';

export const LOP7_UNIT_IMAGES_DIR = '/images/courses/lop7';

export function lop7UnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.webp`;
}

export function lop7UnitImagePath(unit: number): string {
  return `${LOP7_UNIT_IMAGES_DIR}/${lop7UnitImageFileName(unit)}`;
}

export function allLop7UnitImagePaths(): string[] {
  return Array.from({ length: LOP7_UNIT_COUNT }, (_, index) => lop7UnitImagePath(index + 1));
}
