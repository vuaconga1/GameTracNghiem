/**
 * Generate consistent SVG thumbnails for Lớp 4 unit cards.
 *
 * Usage:
 *   npx tsx scripts/generate-lop4-unit-images.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { LOP4_UNIT_COUNT } from '../lib/lop4Units';
import {
  LOP4_THUMB_HEIGHT,
  LOP4_THUMB_WIDTH,
  buildLop4UnitSvg,
  lop4UnitImageFileName,
} from '../lib/lop4UnitThumbnails';

async function main() {
  const outDir = resolve(process.cwd(), 'public/images/courses/lop4');
  await mkdir(outDir, { recursive: true });

  for (let unit = 1; unit <= LOP4_UNIT_COUNT; unit += 1) {
    const fileName = lop4UnitImageFileName(unit);
    const svg = buildLop4UnitSvg(unit);
    const filePath = resolve(outDir, fileName);
    await writeFile(filePath, svg, 'utf8');
    console.log(`Wrote ${filePath}`);
  }

  console.log(
    `\nDone: ${LOP4_UNIT_COUNT} SVG thumbnails (${LOP4_THUMB_WIDTH}x${LOP4_THUMB_HEIGHT}, aspect 4:2.35).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
