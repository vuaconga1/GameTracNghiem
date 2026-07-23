/**
 * Generate consistent SVG thumbnails for Lớp 8 unit cards (units 1–6).
 *
 * Usage:
 *   npx tsx scripts/generate-lop8-unit-images.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { LOP8_UNIT_COUNT } from '../lib/lop8Units';
import {
  LOP8_THUMB_HEIGHT,
  LOP8_THUMB_WIDTH,
  buildLop8UnitSvg,
  lop8UnitImageFileName,
} from '../lib/lop8UnitThumbnails';

async function main() {
  const outDir = resolve(process.cwd(), 'public/images/courses/lop8');
  await mkdir(outDir, { recursive: true });

  for (let unit = 1; unit <= LOP8_UNIT_COUNT; unit += 1) {
    const fileName = lop8UnitImageFileName(unit);
    const svg = buildLop8UnitSvg(unit);
    const filePath = resolve(outDir, fileName);
    await writeFile(filePath, svg, 'utf8');
    console.log(`Wrote ${filePath}`);
  }

  console.log(
    `\nDone: ${LOP8_UNIT_COUNT} SVG thumbnails (${LOP8_THUMB_WIDTH}x${LOP8_THUMB_HEIGHT}, aspect 4:2.35).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
