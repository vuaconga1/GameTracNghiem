/**
 * Generate SVG thumbnails for Lớp 1 unit cards (Global Success 1).
 *
 * Usage:
 *   npx tsx scripts/generate-lop1-unit-images.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { LOP1_UNIT_COUNT } from '../lib/lop1Units';
import {
  LOP1_THUMB_HEIGHT,
  LOP1_THUMB_WIDTH,
  buildLop1UnitSvg,
  lop1UnitImageFileName,
} from '../lib/lop1UnitThumbnails';

async function main() {
  const outDir = resolve(process.cwd(), 'public/images/courses/lop1');
  await mkdir(outDir, { recursive: true });

  for (let unit = 1; unit <= LOP1_UNIT_COUNT; unit += 1) {
    const fileName = lop1UnitImageFileName(unit);
    const svg = buildLop1UnitSvg(unit);
    const filePath = resolve(outDir, fileName);
    await writeFile(filePath, svg, 'utf8');
    console.log(`Wrote ${filePath}`);
  }

  console.log(
    `\nDone: ${LOP1_UNIT_COUNT} SVG thumbnails (${LOP1_THUMB_WIDTH}x${LOP1_THUMB_HEIGHT}, aspect 4:2.35).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
