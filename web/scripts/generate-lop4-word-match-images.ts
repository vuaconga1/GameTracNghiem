/**
 * Crop workbook exercise pictures for Lớp 4 word-match imports.
 *
 * Source pages must already exist as PNGs under:
 *   - tmp_pdf_pages/page-01.png ... page-06.png
 *   - tmp_pdf_pages2/page-07.png ... page-10.png
 *
 * Usage:
 *   npx tsx scripts/generate-lop4-word-match-images.ts
 */
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

import sharp from 'sharp';

import {
  getLop4WorkbookUnit,
  lop4WordMatchImagePath,
  WORD_MATCH_PAGE_CROP_BOXES,
} from '../lib/lop4WorkbookContent';

const OUT_DIR = resolve(process.cwd(), 'public/images/games/lop4-word-match');

function sourcePagePath(page: number): string {
  const fileName = `page-${String(page).padStart(2, '0')}.png`;
  const baseDir = page <= 6 ? 'tmp_pdf_pages' : 'tmp_pdf_pages2';
  return resolve(process.cwd(), baseDir, fileName);
}

async function assertExists(path: string) {
  await access(path, constants.F_OK);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (let unit = 1; unit <= 10; unit += 1) {
    const workbook = getLop4WorkbookUnit(unit);
    const sourcePath = sourcePagePath(workbook.page);
    await assertExists(sourcePath);

    for (const item of workbook.wordMatch.items) {
      const box = WORD_MATCH_PAGE_CROP_BOXES.find((entry) => entry.key === item.cropKey);
      if (!box) {
        throw new Error(`Missing crop box ${item.cropKey} for Unit ${unit}`);
      }

      const relativePath = lop4WordMatchImagePath(unit, item.cropKey).replace(/^\//, '');
      const outputPath = resolve(process.cwd(), 'public', relativePath.replace(/^images\//, 'images/'));

      await sharp(sourcePath)
        .extract({
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        })
        .resize(240, 176, { fit: 'cover' })
        .png()
        .toFile(outputPath);

      console.log(`Unit ${String(unit).padStart(2, '0')} ${item.word} -> ${relativePath}`);
    }
  }

  console.log('\nDone: generated workbook crops for Unit 1-10 word-match.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
