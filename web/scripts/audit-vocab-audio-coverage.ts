/**
 * Audit pronunciation + scramble vocab in DB against public vocab mp3 map.
 *
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/audit-vocab-audio-coverage.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/audit-vocab-audio-coverage.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import '../lib/loadEnv';
import { prisma } from '../lib/db';
import { normalizeMediaKey } from '../lib/media/normalizeMediaKey';
import { resolveVocabAudioUrl, vocabAudioSafeStem } from '../lib/vocabAudio';
import audioMap from '../lib/data/vocabAudioMap.json';

type Payload = Record<string, unknown>;

function asPayload(value: unknown): Payload {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Payload)
    : {};
}

function cleanWord(value: unknown): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordFromPronunciation(payload: Payload): string {
  return cleanWord(payload.targetText || payload.word || payload.prompt);
}

function wordFromScramble(payload: Payload): string {
  return cleanWord(payload.word || payload.targetText || payload.answer);
}

type WordHit = {
  word: string;
  key: string;
  games: Set<string>;
  levels: Set<string>;
  courses: Set<string>;
  hasAudio: boolean;
  audioUrl: string | null;
};

async function main() {
  const envLabel = process.env.WEWIN_ENV || 'unknown';
  const questions = await prisma.question.findMany({
    where: {
      game: { in: ['pronunciation', 'scramble'] },
      active: true,
      archivedAt: null,
    },
    select: {
      game: true,
      payload: true,
      course: { select: { name: true, levelName: true } },
    },
  });

  const byKey = new Map<string, WordHit>();

  for (const q of questions) {
    const payload = asPayload(q.payload);
    const word =
      q.game === 'pronunciation' ? wordFromPronunciation(payload) : wordFromScramble(payload);
    if (!word) continue;
    const key = normalizeMediaKey(word) || normalizeMediaKey(vocabAudioSafeStem(word));
    if (!key) continue;
    const audioUrl = resolveVocabAudioUrl(word);
    let hit = byKey.get(key);
    if (!hit) {
      hit = {
        word,
        key,
        games: new Set(),
        levels: new Set(),
        courses: new Set(),
        hasAudio: Boolean(audioUrl),
        audioUrl,
      };
      byKey.set(key, hit);
    }
    hit.games.add(q.game);
    if (q.course?.levelName) hit.levels.add(q.course.levelName);
    if (q.course?.name) hit.courses.add(q.course.name);
    if (audioUrl) {
      hit.hasAudio = true;
      hit.audioUrl = audioUrl;
    }
  }

  const all = [...byKey.values()].sort((a, b) =>
    a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }),
  );
  const missing = all.filter((w) => !w.hasAudio);
  const matched = all.filter((w) => w.hasAudio);

  const outDir = path.resolve(process.cwd(), '../audio');
  mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, `_still-missing-after-map.${envLabel}.txt`);
  const summaryPath = path.join(outDir, `_audio-map-audit-summary.${envLabel}.txt`);
  // Convenience alias for the latest local run (or neon if only neon was run).
  const aliasReportPath = path.join(outDir, '_still-missing-after-map.txt');
  const aliasSummaryPath = path.join(outDir, '_audio-map-audit-summary.txt');

  const lines = [
    `WEWIN — Vocab still missing static mp3 after map (${envLabel})`,
    `Generated: ${new Date().toISOString()}`,
    `Mapped audio keys: ${Object.keys((audioMap as { byWord?: Record<string, string> }).byWord || {}).length}`,
    `DB unique words (pronunciation + scramble): ${all.length}`,
    `With audio: ${matched.length}`,
    `Still missing: ${missing.length}`,
    '',
    '===== MISSING (A→Z) =====',
    ...missing.map((w, i) => {
      const games = [...w.games].sort().join('+');
      const levels = [...w.levels].sort().join('; ');
      return `${String(i + 1).padStart(4, ' ')}. ${w.word}  [${games}]  (${levels || '—'})`;
    }),
  ];
  writeFileSync(reportPath, lines.join('\n'), 'utf8');
  writeFileSync(aliasReportPath, lines.join('\n'), 'utf8');

  const byLevel = new Map<string, { total: number; missing: number }>();
  for (const w of all) {
    const levels = w.levels.size ? [...w.levels] : ['(unknown)'];
    for (const level of levels) {
      const row = byLevel.get(level) || { total: 0, missing: 0 };
      row.total += 1;
      if (!w.hasAudio) row.missing += 1;
      byLevel.set(level, row);
    }
  }

  const summary = [
    `WEWIN vocab audio audit (${envLabel})`,
    `Generated: ${new Date().toISOString()}`,
    '',
    `Unique DB words: ${all.length}`,
    `With public mp3: ${matched.length}`,
    `Still missing:   ${missing.length}`,
    `Coverage:        ${all.length ? Math.round((matched.length / all.length) * 100) : 0}%`,
    '',
    'Note: "missing" = no file under public/audio/vocab (production static).',
    'Primary grades may still have legacy hierarchical mp3 via /api/wewin-audio',
    'when WEWIN_AUDIO_ROOT is set (local only; not on Vercel by default).',
    '',
    'By level (unique words counted per level they appear in):',
    ...[...byLevel.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
      .map(([level, row]) => {
        const have = row.total - row.missing;
        const pct = row.total ? Math.round((have / row.total) * 100) : 0;
        return `  ${level}: ${have}/${row.total} (${pct}%) · missing ${row.missing}`;
      }),
    '',
    `Missing report: ${reportPath}`,
  ];
  writeFileSync(summaryPath, summary.join('\n'), 'utf8');
  writeFileSync(aliasSummaryPath, summary.join('\n'), 'utf8');

  console.log(
    JSON.stringify(
      {
        env: envLabel,
        uniqueWords: all.length,
        withAudio: matched.length,
        missing: missing.length,
        coveragePct: all.length ? Math.round((matched.length / all.length) * 100) : 0,
        reportPath,
        summaryPath,
        sampleMissing: missing.slice(0, 20).map((w) => w.word),
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
