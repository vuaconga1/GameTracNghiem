import { LOP6_UNIT_COUNT } from './lop6Units';

export const LOP6_UNIT_IMAGES_DIR = '/images/courses/lop6';

export function lop6UnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.webp`;
}

export function lop6UnitImagePath(unit: number): string {
  return `${LOP6_UNIT_IMAGES_DIR}/${lop6UnitImageFileName(unit)}`;
}

export function allLop6UnitImagePaths(): string[] {
  return Array.from({ length: LOP6_UNIT_COUNT }, (_, index) => lop6UnitImagePath(index + 1));
}
