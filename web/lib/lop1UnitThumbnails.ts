import { buildCartoonUnitSvg, LOP1_SCENES } from './cartoonThumbArt';
import { LOP1_UNIT_COUNT, LOP1_UNIT_TITLES } from './lop1Units';

/** Landscape thumbnail size matching `.course-thumb` aspect ratio 4 / 2.35 */
export const LOP1_THUMB_WIDTH = 850;
export const LOP1_THUMB_HEIGHT = 500;

export const LOP1_UNIT_IMAGES_DIR = '/images/courses/lop1';

const BADGE_COLORS: Record<number, string> = {
  1: '#E53935',
  2: '#EF6C00',
  3: '#F9A825',
  4: '#1565C0',
  5: '#EF6C00',
  6: '#2E7D32',
  7: '#558B2F',
  8: '#00838F',
  9: '#7B1FA2',
  10: '#00695C',
  11: '#0277BD',
  12: '#0288D1',
  13: '#00897B',
  14: '#C2185B',
  15: '#1565C0',
  16: '#5E35B1',
};

export function lop1UnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.svg`;
}

export function lop1UnitImagePath(unit: number): string {
  return `${LOP1_UNIT_IMAGES_DIR}/${lop1UnitImageFileName(unit)}`;
}

export function buildLop1UnitSvg(unit: number): string {
  const title = LOP1_UNIT_TITLES[unit];
  const scene = LOP1_SCENES[unit];
  if (!title || !scene) {
    throw new Error(`Unknown Lớp 1 unit: ${unit}`);
  }

  return buildCartoonUnitSvg(
    unit,
    title,
    scene,
    BADGE_COLORS[unit] ?? '#1565C0',
    LOP1_THUMB_WIDTH,
    LOP1_THUMB_HEIGHT,
  );
}

export function allLop1UnitImagePaths(): string[] {
  return Array.from({ length: LOP1_UNIT_COUNT }, (_, index) => lop1UnitImagePath(index + 1));
}
