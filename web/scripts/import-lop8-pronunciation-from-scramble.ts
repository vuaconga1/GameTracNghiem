/**
 * Copy Lớp 8 scramble vocab → pronunciation for Units 1–6.
 *
 * Source: active scramble questions (GS8-SCRAMBLE-U{n}-…)
 * Target: pronunciation with externalId GS8-PRON-U{n}-…
 * Payload: word → targetText, hint → hint; targetIpa / referenceAudioUrl left empty
 *   (PronunciationGame falls back to browser speechSynthesis for the word).
 * Skill: pronunciation → speaking; ensures speaking skill is enabled.
 *
 * Idempotent: archives prior GS8-PRON-* and any other active pronunciation
 * on the course before insert.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-pronunciation-from-scramble.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop8-pronunciation-from-scramble.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  findLop8CourseByUnit,
  LOP8_LEVEL,
  LOP8_UNIT_COUNT,
} from '../lib/lop8Units';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';

const LEVEL = LOP8_LEVEL;
const SOURCE_GAME = 'scramble';
const TARGET_GAME = 'pronunciation';
const EXTERNAL_PREFIX = 'GS8-PRON';

type ScramblePayload = { word?: string; hint?: string };

type UnitReport = {
  unit: number;
  courseName: string;
  scramble: number;
  pronunciation: number;
  archived: number;
};

async function ensureSpeakingSkill(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  let mapChanged = false;
  if (map.pronunciation !== 'speaking') {
    map.pronunciation = 'speaking';
    mapChanged = true;
  }

  const enabledSet = new Set(resolveEnabledSkillIds(course.enabledSkills));
  const hadSpeaking = enabledSet.has('speaking');
  enabledSet.add('speaking');
  const enabledSkills = SKILL_IDS.filter((id) => enabledSet.has(id));
  const skillsChanged = !hadSpeaking;

  const enabledGames = deriveEnabledGamesFromSkills(
    map,
    enabledSkills,
    course.enabledGames
  );

  if (!mapChanged && !skillsChanged) return;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      gameSkills: map as Prisma.InputJsonValue,
      enabledSkills,
      enabledGames,
    },
  });
}

async function importUnit(unit: number): Promise<UnitReport | null> {
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    console.warn(`Skip: không có ${LEVEL} / Unit ${unit}`);
    return null;
  }

  const scrambleRows = await prisma.question.findMany({
    where: {
      courseId: course.id,
      game: SOURCE_GAME,
      active: true,
      archivedAt: null,
    },
    orderBy: { sortOrder: 'asc' },
  });

  if (scrambleRows.length === 0) {
    console.warn(`Skip: ${course.name} chưa có scramble`);
    return {
      unit,
      courseName: course.name,
      scramble: 0,
      pronunciation: 0,
      archived: 0,
    };
  }

  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  // Archive prior GS8-PRON-* imports for this unit
  const archivedByPrefix = await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: TARGET_GAME,
      archivedAt: null,
      externalId: { startsWith: prefix },
    },
    data: { archivedAt: new Date(), active: false },
  });

  // Also archive any other active pronunciation on this course (clean slate)
  const archivedRest = await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: TARGET_GAME,
      archivedAt: null,
      active: true,
    },
    data: { archivedAt: new Date(), active: false },
  });

  const archived = archivedByPrefix.count + archivedRest.count;

  await ensureSpeakingSkill(course.id);

  let created = 0;
  for (let i = 0; i < scrambleRows.length; i++) {
    const row = scrambleRows[i];
    const src = (row.payload ?? {}) as ScramblePayload;
    const word = String(src.word || '').trim();
    if (!word) continue;
    const hint = String(src.hint || '').trim();

    const payload = parseGamePayload(TARGET_GAME, {
      mode: 'word',
      modeLabel: 'Luyện từ',
      prompt: `Đọc từ vựng Unit ${unit}`,
      targetText: word,
      targetIpa: '',
      referenceAudioUrl: '',
      hint,
    });

    const slug = word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const externalId = `${prefix}${String(i + 1).padStart(2, '0')}-${slug}`;

    await prisma.question.create({
      data: {
        courseId: course.id,
        game: TARGET_GAME,
        active: true,
        sortOrder: i + 1,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }

  console.log(
    `${LEVEL} ${course.name}: scramble=${scrambleRows.length} → pronunciation=${created}` +
      (archived ? ` (archived ${archived} prior)` : '')
  );

  return {
    unit,
    courseName: course.name,
    scramble: scrambleRows.length,
    pronunciation: created,
    archived,
  };
}

async function main() {
  const reports: UnitReport[] = [];
  for (let unit = 1; unit <= LOP8_UNIT_COUNT; unit++) {
    const report = await importUnit(unit);
    if (report) reports.push(report);
  }

  console.log('\n=== Summary (scramble vs pronunciation) ===');
  let mismatch = 0;
  for (const r of reports) {
    const ok = r.scramble === r.pronunciation ? 'OK' : 'MISMATCH';
    if (ok === 'MISMATCH') mismatch += 1;
    console.log(
      `  Unit ${r.unit}: scramble=${r.scramble} pronunciation=${r.pronunciation} [${ok}]`
    );
  }
  const totalScramble = reports.reduce((s, r) => s + r.scramble, 0);
  const totalPron = reports.reduce((s, r) => s + r.pronunciation, 0);
  console.log(
    `\nDone: ${reports.length} unit(s), scramble=${totalScramble}, pronunciation=${totalPron}` +
      (mismatch ? ` — ${mismatch} unit(s) mismatched` : ' — all match')
  );

  if (mismatch) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
