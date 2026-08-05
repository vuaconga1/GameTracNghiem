import { buildCartoonUnitSvg, buildPrimaryCenteredUnitScene } from './cartoonThumbArt';
import { PRIMARY_GRADE_SPECS, type PrimaryGradeId } from './primaryGradeSpecs';

export const PRIMARY_THUMB_WIDTH = 850;
export const PRIMARY_THUMB_HEIGHT = 500;

const BADGE_COLORS = [
  '#E53935',
  '#EF6C00',
  '#F9A825',
  '#2E7D32',
  '#00838F',
  '#1565C0',
  '#5E35B1',
  '#C2185B',
  '#6D4C41',
  '#455A64',
];

export function primaryUnitImageFileName(unit: number): string {
  return `unit-${String(unit).padStart(2, '0')}.svg`;
}

export function primaryUnitImagePath(grade: PrimaryGradeId, unit: number): string {
  const spec = PRIMARY_GRADE_SPECS[grade];
  return `${spec.imagesDir}/${primaryUnitImageFileName(unit)}`;
}

export function buildPrimaryUnitSvg(grade: PrimaryGradeId, unit: number): string {
  const spec = PRIMARY_GRADE_SPECS[grade];
  const title = spec.titles[unit];
  if (!title) throw new Error(`Unknown ${spec.levelName} unit ${unit}`);
  const scene = buildPrimaryCenteredUnitScene(grade, unit, title);
  const badge = BADGE_COLORS[(unit - 1) % BADGE_COLORS.length]!;
  return buildCartoonUnitSvg(
    unit,
    title,
    scene,
    badge,
    PRIMARY_THUMB_WIDTH,
    PRIMARY_THUMB_HEIGHT,
  );
}
