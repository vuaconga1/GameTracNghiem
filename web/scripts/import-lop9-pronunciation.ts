/**
 * Import Lớp 9 Speaking → Phát âm from Pronunciation_Lop9.docx (per-phoneme cards).
 *
 * NOT from scramble vocab. Supersedes import-lop9-pronunciation-from-scramble.ts for L9.
 *
 * Regenerate:
 *   py -3 scripts/data/_parse_lop9_pronunciation_docx.py
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop9-pronunciation.ts --unit 1
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop9-pronunciation.ts
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  ensureLop9Course,
  findLop9CourseByUnit,
  LOP9_LEVEL,
} from '../lib/lop9Units';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';

const LEVEL = LOP9_LEVEL;
const GAME = 'pronunciation';
const EXTERNAL_PREFIX = 'GS9-PRON';
const PARSED_PATH = resolve(process.cwd(), 'scripts/data/pronunciation-lop9-parsed.json');

type VocabWord = {
  word: string;
  pos?: string;
  ipa?: string;
  meaning?: string;
};

type SoundSection = {
  index: number;
  ipa: string;
  title: string;
  heading: string;
  slug: string;
  words: VocabWord[];
  theory: string[];
};

type UnitParsed = {
  title: string;
  intro: string[];
  sounds: SoundSection[];
};

type ParsedFile = Record<string, UnitParsed>;

function parseUnitArg(): number | null {
  const idx = process.argv.indexOf('--unit');
  if (idx < 0) return null;
  const n = Number(process.argv[idx + 1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function slugWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const THEORY_HEADER_RE = /^\d+(?:\.\d+)+(?:\.)?\s/;
const POS_RE = /^(n|v|adj|adv|prep|conj|pron|interj|det|num|phr\.v|n\/v|v\/n|n\.,v\.|v\.,n\.)\.?$/i;
const IPA_RE = /^[/ˈˌ][^ ]*[/]?$/u;

function isTheoryNoise(line: string): boolean {
  const value = line.trim();
  if (!value) return true;
  if (value === 'Từ vựng' || value === 'Từ loại' || value === 'Phiên âm' || value === 'Ý nghĩa') {
    return true;
  }
  if (POS_RE.test(value) || IPA_RE.test(value)) return true;
  if (/^[A-Za-z][A-Za-z\s,'-]{0,24}$/u.test(value) && !THEORY_HEADER_RE.test(value)) return true;
  return false;
}

export function theoryBlurb(sound: SoundSection, intro: string[], isFirst: boolean): string {
  const lines: string[] = [];
  if (isFirst && intro.length) {
    lines.push(...intro.slice(0, 2), '');
  }
  lines.push(sound.heading || sound.title);
  let skippingExamples = false;
  for (const line of sound.theory) {
    const t = String(line || '').trim();
    if (!t) continue;
    if (/^Các em luyện phát âm/i.test(t)) {
      skippingExamples = true;
      continue;
    }
    if (THEORY_HEADER_RE.test(t)) {
      skippingExamples = false;
    }
    if (skippingExamples || isTheoryNoise(t)) continue;
    lines.push(t);
    if (lines.length >= 18) break;
  }
  return lines.join('\n').trim();
}

async function ensureSpeakingSkill(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.pronunciation = 'speaking';

  const enabledSet = new Set(resolveEnabledSkillIds(course.enabledSkills));
  enabledSet.add('speaking');
  const enabledSkills = SKILL_IDS.filter((id) => enabledSet.has(id));
  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, course.enabledGames);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      gameSkills: map as Prisma.InputJsonValue,
      enabledSkills,
      enabledGames,
    },
  });
}

export function buildPronunciationRows(sound: SoundSection, intro: string[], isFirst: boolean) {
  const exercise = sound.title || `Âm /${sound.ipa}/`;
  const exerciseKey = sound.slug || `S${sound.index}`;
  const theoryText = theoryBlurb(sound, intro, isFirst);
  let wordOrdinal = 0;

  return sound.words
    .map((item) => {
      const word = String(item.word || '').trim();
      if (!word) return null;
      wordOrdinal += 1;
      const hint = String(item.meaning || '').trim();
      const targetIpa = String(item.ipa || '').trim();
      return parseGamePayload(GAME, {
        mode: 'phoneme',
        modeLabel: 'Luyện từ',
        exercise,
        exerciseKey,
        theoryText: wordOrdinal === 1 ? theoryText : '',
        prompt: `Đọc từ có âm /${sound.ipa}/`,
        targetText: word,
        targetIpa,
        referenceAudioUrl: '',
        hint,
      });
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

async function importUnitQuestions(unit: number, data: UnitParsed) {
  await ensureLop9Course(prisma, unit);
  const course = await findLop9CourseByUnit(prisma, unit);
  if (!course) throw new Error(`Missing ${LEVEL} Unit ${unit}`);

  await ensureSpeakingSkill(course.id);

  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;
  // Archive prior scramble-derived and previous phoneme imports for this unit.
  const archived = await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: GAME,
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });

  let created = 0;
  let sortOrder = 0;
  const counts: Array<{ slug: string; title: string; words: number }> = [];

  for (let soundIndex = 0; soundIndex < data.sounds.length; soundIndex++) {
    const sound = data.sounds[soundIndex]!;
    const rows = buildPronunciationRows(sound, data.intro, soundIndex === 0);
    const exercise = sound.title || `Âm /${sound.ipa}/`;
    const exerciseKey = sound.slug || `S${sound.index}`;

    for (let wordOrdinal = 0; wordOrdinal < rows.length; wordOrdinal++) {
      sortOrder += 1;
      const payload = rows[wordOrdinal]!;
      const word = String(payload.targetText || '').trim();
      const externalId = `${prefix}${exerciseKey}-${String(wordOrdinal + 1).padStart(2, '0')}-${slugWord(word)}`;
      await prisma.question.create({
        data: {
          courseId: course.id,
          game: GAME,
          active: true,
          sortOrder,
          externalId,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      created += 1;
    }

    counts.push({ slug: exerciseKey, title: exercise, words: rows.length });
  }

  console.log(
    `${LEVEL} ${course.name}: archived=${archived.count} pronunciation=${created}`,
  );
  for (const row of counts) {
    console.log(`  ${row.title} (${row.slug}): ${row.words} words`);
  }

  return { courseId: course.id, created, counts };
}

async function importUnit(unit: number, parsed: ParsedFile) {
  const key = String(unit);
  const data = parsed[key];
  if (!data) throw new Error(`Unit ${unit} missing in ${PARSED_PATH}`);

  const { created, counts } = await importUnitQuestions(unit, data);
  return { created, counts };
}

async function main() {
  const raw = await readFile(PARSED_PATH, 'utf8');
  const parsed = JSON.parse(raw) as ParsedFile;
  const only = parseUnitArg();
  const units = only != null ? [only] : [1, 2, 3, 4, 5, 6];

  let total = 0;
  for (const unit of units) {
    console.log(`\n=== Unit ${unit} ===`);
    const result = await importUnit(unit, parsed);
    total += result.created;
  }
  console.log(`\nDone: pronunciation=${total}`);
}

if (process.argv[1]?.endsWith('import-lop9-pronunciation.ts')) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
