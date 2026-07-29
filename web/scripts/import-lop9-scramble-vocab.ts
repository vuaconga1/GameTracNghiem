/**
 * Import scramble vocab for Lớp 9 from Tuvung_Lop9.docx.
 *
 * Content: scripts/data/lop9-tuvung-vocab.json
 * Regenerate: py -3 scripts/data/_gen_lop9_tuvung_vocab.py
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop9-scramble-vocab.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop9-scramble-vocab.ts --unit 1
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  ensureLop9Course,
  LOP9_LEVEL,
  lop9UnitCourseName,
} from '../lib/lop9Units';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';

const LEVEL = LOP9_LEVEL;
const GAME = 'scramble';
const EXTERNAL_PREFIX = 'GS9-SCRAMBLE';
const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop9-tuvung-vocab.json');

type VocabItem = { word: string; hint: string };
type ContentFile = {
  units: Record<string, VocabItem[]>;
};

function parseUnitArg(): number | null {
  const idx = process.argv.indexOf('--unit');
  if (idx < 0) return null;
  const n = Number(process.argv[idx + 1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function ensureVocabularySkill(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.scramble = 'vocabulary';

  const enabledSet = new Set(resolveEnabledSkillIds(course.enabledSkills));
  enabledSet.add('vocabulary');
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

async function importUnit(unit: number, words: VocabItem[]) {
  const course = await ensureLop9Course(prisma, unit);
  const courseName = lop9UnitCourseName(unit);
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  await ensureVocabularySkill(course.id);

  await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: GAME,
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });

  let created = 0;
  for (let i = 0; i < words.length; i++) {
    const { word, hint } = words[i]!;
    const payload = parseGamePayload(GAME, { word, hint, image: '' });
    const externalId = `${prefix}${String(i + 1).padStart(2, '0')}-${word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

    await prisma.question.create({
      data: {
        courseId: course.id,
        game: GAME,
        active: true,
        sortOrder: i + 1,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }

  console.log(`${LEVEL} ${courseName}: ${created} từ`);
  return created;
}

async function main() {
  const content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as ContentFile;
  const only = parseUnitArg();
  const units = Object.keys(content.units)
    .map(Number)
    .filter((u) => (only == null ? true : u === only))
    .sort((a, b) => a - b);

  if (units.length === 0) {
    throw new Error(only ? `No vocab for unit ${only}` : 'No units in content file');
  }

  let total = 0;
  for (const unit of units) {
    total += await importUnit(unit, content.units[String(unit)] ?? []);
  }

  console.log(`\nDone: ${units.length} unit(s), ${total} scramble words.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
