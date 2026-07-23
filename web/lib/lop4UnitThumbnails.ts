import { buildCartoonUnitSvg, LOP4_SCENES } from './cartoonThumbArt';
import { LOP4_UNIT_COUNT, LOP4_UNIT_TITLES } from './lop4Units';

/** Landscape thumbnail size matching `.course-thumb` aspect ratio 4 / 2.35 */
export const LOP4_THUMB_WIDTH = 850;
export const LOP4_THUMB_HEIGHT = 500;

export const LOP4_UNIT_IMAGES_DIR = '/images/courses/lop4';

const BADGE_COLORS: Record<number, string> = {
  1: '#E53935',
  2: '#1565C0',
  3: '#5E35B1',
  4: '#C2185B',
  5: '#2E7D32',
  6: '#00695C',
  7: '#3949AB',
  8: '#C62828',
  9: '#E64A19',
  10: '#0277BD',
  11: '#EF6C00',
  12: '#5D4037',
  13: '#AD1457',
  14: '#00838F',
  15: '#558B2F',
  16: '#1565C0',
  17: '#37474F',
  18: '#7B1FA2',
  19: '#2E7D32',
};

export function lop4UnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.svg`;
}

export function lop4UnitImagePath(unit: number): string {
  return `${LOP4_UNIT_IMAGES_DIR}/${lop4UnitImageFileName(unit)}`;
}

export function buildLop4UnitSvg(unit: number): string {
  const title = LOP4_UNIT_TITLES[unit];
  const scene = LOP4_SCENES[unit];
  if (!title || !scene) {
    throw new Error(`Unknown Lớp 4 unit: ${unit}`);
  }

  return buildCartoonUnitSvg(
    unit,
    title,
    scene,
    BADGE_COLORS[unit] ?? '#1565C0',
    LOP4_THUMB_WIDTH,
    LOP4_THUMB_HEIGHT,
  );
}

export function allLop4UnitImagePaths(): string[] {
  return Array.from({ length: LOP4_UNIT_COUNT }, (_, index) => lop4UnitImagePath(index + 1));
}
