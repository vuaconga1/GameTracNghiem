/**
 * Compress large game PNGs: write sibling .webp + shrink original .png (same URL).
 * Usage: node scripts/optimize-game-pngs.mjs [--min-kb=150] [--max-width=1280] [--limit=0]
 */
import { readdir, stat, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'public', 'images', 'games');

const args = process.argv.slice(2);
function argNum(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
}

const minBytes = argNum('min-kb', 150) * 1024;
const maxWidth = argNum('max-width', 1280);
const limit = argNum('limit', 0);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (/\.png$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function optimizeOne(file) {
  const before = (await stat(file)).size;
  if (before < minBytes) return null;

  const webpPath = file.replace(/\.png$/i, '.webp');
  const tmpPng = `${file}.tmp.png`;

  const pipeline = sharp(file).rotate().resize({
    width: maxWidth,
    height: maxWidth,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const [webpBuf, pngBuf] = await Promise.all([
    pipeline.clone().webp({ quality: 72, effort: 4 }).toBuffer(),
    pipeline.clone().png({ compressionLevel: 9, effort: 6 }).toBuffer(),
  ]);

  await writeFile(webpPath, webpBuf);

  // Only replace PNG when the resized PNG is meaningfully smaller.
  if (pngBuf.length < before * 0.9) {
    await writeFile(tmpPng, pngBuf);
    await rename(tmpPng, file);
  } else {
    try {
      await unlink(tmpPng);
    } catch {
      /* ignore */
    }
  }

  const afterPng = (await stat(file)).size;
  const afterWebp = (await stat(webpPath)).size;
  return {
    file: path.relative(root, file),
    before,
    afterPng,
    afterWebp,
  };
}

const files = await walk(root);
const targets = [];
for (const file of files) {
  const size = (await stat(file)).size;
  if (size >= minBytes) targets.push(file);
}
targets.sort((a, b) => a.localeCompare(b));
const slice = limit > 0 ? targets.slice(0, limit) : targets;

console.log(`Optimizing ${slice.length} / ${targets.length} PNGs under ${root}`);

let saved = 0;
let done = 0;
for (const file of slice) {
  try {
    const result = await optimizeOne(file);
    done += 1;
    if (result) {
      const delta = result.before - Math.min(result.afterPng, result.afterWebp);
      saved += Math.max(0, result.before - result.afterPng);
      if (done % 25 === 0 || done === slice.length) {
        console.log(
          `[${done}/${slice.length}] ${result.file}: ${(result.before / 1024).toFixed(0)}KB → png ${(result.afterPng / 1024).toFixed(0)}KB / webp ${(result.afterWebp / 1024).toFixed(0)}KB`,
        );
      }
    }
  } catch (err) {
    console.error(`FAIL ${file}:`, err instanceof Error ? err.message : err);
  }
}

console.log(`Done. Approx PNG bytes saved: ${(saved / 1024 / 1024).toFixed(1)} MB`);
