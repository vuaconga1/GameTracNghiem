/**
 * Build a compact word→audio relative-path map from wewin-audio-vocab-map.csv
 * for primary grades (Lớp 1–5).
 *
 * Usage:
 *   npx tsx scripts/build-primary-vocab-audio-map.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { normalizeMediaKey } from '../lib/media/normalizeMediaKey';

const CSV_PATH =
  process.env.WEWIN_AUDIO_VOCAB_CSV ||
  resolve(process.cwd(), '../../../wewin-audio-vocab-map.csv');
const OUT_PATH = resolve(process.cwd(), 'lib/data/primaryVocabAudioMap.json');

const PRIMARY_GRADES = new Set(['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5']);

/** Prefer younger-learner packs for primary grades. */
const LEVEL_SCORE: Record<string, number> = {
  starter: 40,
  kids: 35,
  mover: 20,
  flyer: 15,
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function unitNumber(unitLabel: string): number | null {
  const m = /Unit\s+(\d+)/i.exec(unitLabel);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function pickBestPath(paths: string[]): string | null {
  if (!paths.length) return null;
  let best = paths[0];
  let bestScore = -1;
  for (const p of paths) {
    const level = p.split('/')[0]?.toLowerCase() || '';
    const score = LEVEL_SCORE[level] ?? 0;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

function main() {
  const raw = readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const byGradeUnitWord = new Map<string, string>();
  const byWord = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 7) continue;
    const grade = cols[0].trim();
    const unitLabel = cols[1].trim();
    const word = cols[2].trim();
    const matched = cols[5].trim().toLowerCase();
    const audioPaths = cols[6]
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!PRIMARY_GRADES.has(grade) || matched !== 'yes' || !audioPaths.length) continue;
    const unit = unitNumber(unitLabel);
    const wordKey = normalizeMediaKey(word);
    const path = pickBestPath(audioPaths);
    if (!path || !wordKey) continue;
    if (unit) {
      byGradeUnitWord.set(`${grade}|${unit}|${wordKey}`, path);
    }
    if (!byWord.has(wordKey)) byWord.set(wordKey, path);
  }

  const payload = {
    byGradeUnitWord: Object.fromEntries(byGradeUnitWord),
    byWord: Object.fromEntries(byWord),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(payload)}\n`, 'utf8');
  console.log(
    `Wrote ${OUT_PATH} (${byGradeUnitWord.size} grade/unit keys, ${byWord.size} word keys)`
  );
}

main();
