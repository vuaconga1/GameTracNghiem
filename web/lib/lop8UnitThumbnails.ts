import { buildCartoonUnitSvg, LOP8_SCENES } from './cartoonThumbArt';
import { LOP8_UNIT_COUNT, LOP8_UNIT_TITLES } from './lop8Units';

/** Landscape thumbnail size matching `.course-thumb` aspect ratio 4 / 2.35 */
export const LOP8_THUMB_WIDTH = 850;
export const LOP8_THUMB_HEIGHT = 500;

export const LOP8_UNIT_IMAGES_DIR = '/images/courses/lop8';

const BADGE_COLORS: Record<number, string> = {
  1: '#E64A19',
  2: '#2E7D32',
  3: '#7B1FA2',
  4: '#C62828',
  5: '#F57C00',
  6: '#00838F',
};

export function lop8UnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.svg`;
}

export function lop8UnitImagePath(unit: number): string {
  return `${LOP8_UNIT_IMAGES_DIR}/${lop8UnitImageFileName(unit)}`;
}

export function buildLop8UnitSvg(unit: number): string {
  const title = LOP8_UNIT_TITLES[unit];
  const scene = LOP8_SCENES[unit];
  if (!title || !scene) {
    throw new Error(`Unknown Lớp 8 unit: ${unit}`);
  }

  return buildCartoonUnitSvg(
    unit,
    title,
    scene,
    BADGE_COLORS[unit] ?? '#1565C0',
    LOP8_THUMB_WIDTH,
    LOP8_THUMB_HEIGHT,
  );
}

export function allLop8UnitImagePaths(): string[] {
  return Array.from({ length: LOP8_UNIT_COUNT }, (_, index) => lop8UnitImagePath(index + 1));
}
