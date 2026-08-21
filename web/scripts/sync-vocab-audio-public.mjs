/**
 * Copy renamed flat vocab mp3s into public/audio/vocab and write
 * lib/data/vocabAudioMap.json (normalizeMediaKey → filename).
 *
 * Skips meta/plan files and "word (2).mp3" duplicates (prefer word.mp3).
 *
 *   node scripts/sync-vocab-audio-public.mjs
 *   node scripts/sync-vocab-audio-public.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const AUDIO_SRC = path.resolve(process.cwd(), '../audio');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public/audio/vocab');
const MAP_PATH = path.resolve(process.cwd(), 'lib/data/vocabAudioMap.json');
const RENAME_CSV = path.join(AUDIO_SRC, '_rename-plan-v2.csv');

function normalizeMediaKey(input) {
  const base = String(input || '')
    .trim()
    .replace(/^.*[\\/]/, '');
  const withoutExt = base.replace(/\.[^.]+$/, '');
  return withoutExt
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same as plan-elevenlabs-rename safeFileName stem (for slash words → space). */
function safeStem(word) {
  return String(word || '')
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function isDuplicateParenTwo(name) {
  return /\(\s*2\s*\)\.mp3$/i.test(name);
}

function isMetaFile(name) {
  return name.startsWith('_') || !/\.mp3$/i.test(name);
}

function setKey(map, key, filename, collisions) {
  if (!key) return;
  const prev = map.get(key);
  if (prev && prev !== filename) {
    collisions.push({ key, keep: prev, skipped: filename });
    return;
  }
  map.set(key, filename);
}

const files = fs
  .readdirSync(AUDIO_SRC)
  .filter((name) => !isMetaFile(name) && !isDuplicateParenTwo(name));

/** @type {Map<string, string>} */
const byWord = new Map();
const collisions = [];

for (const filename of files) {
  const stem = path.basename(filename, path.extname(filename));
  setKey(byWord, normalizeMediaKey(stem), filename, collisions);
}

// Authoritative word → file from rename plan (handles "3PL / 4PL" vs "3PL 4PL.mp3")
if (fs.existsSync(RENAME_CSV)) {
  const lines = fs.readFileSync(RENAME_CSV, 'utf8').trim().split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const word = cols[1]?.trim();
    const targetFile = cols[4]?.trim();
    if (!word || !targetFile) continue;
    if (!files.includes(targetFile) && !fs.existsSync(path.join(AUDIO_SRC, targetFile))) {
      continue;
    }
    const filename = files.includes(targetFile) ? targetFile : targetFile;
    setKey(byWord, normalizeMediaKey(word), filename, collisions);
    setKey(byWord, normalizeMediaKey(safeStem(word)), filename, collisions);
  }
}

if (!dryRun) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  // Clear previous vocab copies so renames don't leave orphans
  for (const existing of fs.readdirSync(PUBLIC_DIR)) {
    if (/\.mp3$/i.test(existing)) {
      fs.unlinkSync(path.join(PUBLIC_DIR, existing));
    }
  }
  for (const filename of files) {
    fs.copyFileSync(path.join(AUDIO_SRC, filename), path.join(PUBLIC_DIR, filename));
  }
  fs.mkdirSync(path.dirname(MAP_PATH), { recursive: true });
  const payload = {
    version: 1,
    source: path.relative(process.cwd(), AUDIO_SRC).split(path.sep).join('/'),
    publicPrefix: '/audio/vocab',
    count: byWord.size,
    byWord: Object.fromEntries([...byWord.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  };
  fs.writeFileSync(MAP_PATH, `${JSON.stringify(payload)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      dryRun,
      sourceFiles: files.length,
      mappedKeys: byWord.size,
      collisions: collisions.length,
      sampleCollisions: collisions.slice(0, 8),
      publicDir: PUBLIC_DIR,
      mapPath: MAP_PATH,
      skippedDuplicate: 'elderly (2).mp3 (and similar *(2).mp3)',
    },
    null,
    2
  )
);
