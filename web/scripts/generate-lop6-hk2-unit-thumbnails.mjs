/** Generate consistent local course-card thumbnails for Lớp 6 Unit 7–12. */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const units = [
  [7, 'TELEVISION', '#4338ca', '#7c3aed'],
  [8, 'SPORTS & GAMES', '#047857', '#14b8a6'],
  [9, 'CITIES OF THE WORLD', '#0369a1', '#38bdf8'],
  [10, 'OUR HOUSE IN THE FUTURE', '#6d28d9', '#c084fc'],
  [11, 'OUR GREENER WORLD', '#15803d', '#84cc16'],
  [12, 'ROBOTS', '#b45309', '#f59e0b'],
];
const outDir = resolve(process.cwd(), 'public/images/courses/lop6');
await mkdir(outDir, { recursive: true });

for (const [unit, title, start, end] of units) {
  const safeTitle = title.replaceAll('&', '&amp;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="1200" height="675" rx="48" fill="url(#g)"/><circle cx="1040" cy="110" r="190" fill="white" opacity=".12"/><circle cx="1050" cy="590" r="280" fill="white" opacity=".09"/><path d="M70 510 C240 390 350 610 530 470 S840 390 1130 505" fill="none" stroke="white" stroke-width="18" opacity=".16"/><text x="78" y="120" fill="white" font-family="Arial" font-size="42" font-weight="700">GLOBAL SUCCESS 6</text><text x="78" y="330" fill="white" font-family="Arial" font-size="132" font-weight="900">UNIT ${unit}</text><text x="84" y="415" fill="white" font-family="Arial" font-size="48" font-weight="700">${safeTitle}</text></svg>`;
  const fileName = `unit-${String(unit).padStart(2, '0')}.webp`;
  await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(resolve(outDir, fileName));
  console.log(fileName);
}
