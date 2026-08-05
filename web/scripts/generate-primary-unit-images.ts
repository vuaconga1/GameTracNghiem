/**
 * Generate SVG unit-card thumbnails for Lớp 2 / 3 / 5.
 *
 * Usage:
 *   npx tsx scripts/generate-primary-unit-images.ts --grade=all
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parsePrimaryGradeArg, PRIMARY_GRADE_SPECS } from '../lib/primaryGradeSpecs';
import {
  PRIMARY_THUMB_HEIGHT,
  PRIMARY_THUMB_WIDTH,
  buildPrimaryUnitSvg,
  primaryUnitImageFileName,
} from '../lib/primaryUnitThumbnails';

async function main() {
  const grades = parsePrimaryGradeArg(process.argv.slice(2));
  for (const grade of grades) {
    const spec = PRIMARY_GRADE_SPECS[grade];
    const outDir = resolve(process.cwd(), `public/images/courses/lop${grade}`);
    await mkdir(outDir, { recursive: true });
    for (let unit = 1; unit <= spec.unitCount; unit += 1) {
      const fileName = primaryUnitImageFileName(unit);
      const svg = buildPrimaryUnitSvg(grade, unit);
      const filePath = resolve(outDir, fileName);
      await writeFile(filePath, svg, 'utf8');
      console.log(`Wrote ${filePath}`);
    }
    console.log(
      `\n${spec.levelName}: ${spec.unitCount} SVG thumbnails (${PRIMARY_THUMB_WIDTH}x${PRIMARY_THUMB_HEIGHT}).`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
