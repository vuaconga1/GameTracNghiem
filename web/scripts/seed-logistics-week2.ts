/**
 * Seed Logistics Week 2 courses + attach PDF ebooks.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-logistics-week2.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-logistics-week2.ts
 */
import '../lib/loadEnv';

import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { PDFDocument } from 'pdf-lib';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { makeEbookStorageKey, saveEbookFile } from '../lib/ebookStorage';
import {
  LOGISTICS_LEVEL,
  LOGISTICS_WEEK2_COURSES,
  type LogisticsCourseSeed,
} from '../lib/logisticsUnits';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  SKILL_IDS,
} from '../lib/skillCatalog';

const PDF_DIR =
  process.env.LOGISTICS_WEEK2_PDF_DIR ||
  'E:/Wewin/Wewin-Education-main/anh_wewin/flyer/unit 7/Castle & Environment';

type Week2Seed = LogisticsCourseSeed & { pdfFileName: string };

const WEEK2_SEEDS: Week2Seed[] = [
  {
    ...LOGISTICS_WEEK2_COURSES[0],
    pdfFileName: 'Phone Etiquette & Basic Cargo Enquiries LV1.pdf',
  },
  {
    ...LOGISTICS_WEEK2_COURSES[1],
    pdfFileName: 'Topic 4_ Container Types & Loading Specs.pdf',
  },
  {
    ...LOGISTICS_WEEK2_COURSES[2],
    pdfFileName: 'Logistics English - Dangerous Goods (DG) - Session 3 - Level 2.pdf',
  },
];

async function countPdfPages(bytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

async function upsertEbookFromPdf(title: string, pdfPath: string) {
  const originalName = basename(pdfPath);
  const bytes = readFileSync(pdfPath);
  const pageCount = await countPdfPages(bytes);

  const existing = await prisma.ebook.findFirst({
    where: {
      archivedAt: null,
      OR: [
        { title: { equals: title, mode: 'insensitive' } },
        { originalName: { equals: originalName, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const storageKey = await saveEbookFile(makeEbookStorageKey(existing.id), bytes);
    await prisma.ebook.update({
      where: { id: existing.id },
      data: {
        title,
        originalName,
        storageKey,
        pageCount,
        active: true,
        archivedAt: null,
      },
    });
    console.log(`Ebook update: ${title} (${existing.id}) — ${pageCount} pages`);
    return { id: existing.id, pageCount };
  }

  const created = await prisma.ebook.create({
    data: {
      title,
      originalName,
      storageKey: 'pending.pdf',
      pageCount,
      active: true,
    },
  });
  const storageKey = await saveEbookFile(makeEbookStorageKey(created.id), bytes);
  await prisma.ebook.update({
    where: { id: created.id },
    data: { storageKey },
  });
  console.log(`Ebook create: ${title} (${created.id}) — ${pageCount} pages`);
  return { id: created.id, pageCount };
}

function logisticsGameSkills(): Prisma.InputJsonValue {
  const map = normalizeGameSkillsMap(null);
  map.scramble = 'vocabulary';
  map.pronunciation = 'speaking';
  if (map.quiz === 'vocabulary') map.quiz = null;
  return map as Prisma.InputJsonValue;
}

async function ensureCourse(seed: Week2Seed, ebookId: string, pageCount: number) {
  const enabledSkills = SKILL_IDS.filter((id) => id === 'vocabulary' || id === 'speaking');
  const gameSkills = logisticsGameSkills();
  const enabledGames = deriveEnabledGamesFromSkills(
    normalizeGameSkillsMap(gameSkills),
    enabledSkills,
    []
  );

  const existing = await prisma.course.findFirst({
    where: {
      OR: [{ id: seed.id }, { name: seed.name, levelName: LOGISTICS_LEVEL }],
    },
    select: { id: true },
  });

  const data = {
    name: seed.name,
    levelName: LOGISTICS_LEVEL,
    active: true,
    archivedAt: null,
    ebookFileId: ebookId,
    ebookPageStart: 1,
    ebookPageEnd: pageCount,
    enabledSkills,
    enabledGames,
    gameSkills,
  };

  const course =
    existing != null
      ? await prisma.course.update({ where: { id: existing.id }, data })
      : await prisma.course.create({
          data: {
            id: seed.id,
            ...data,
          },
        });

  for (const skillId of enabledSkills) {
    await prisma.courseSkillLesson.upsert({
      where: { courseId_skillId: { courseId: course.id, skillId } },
      update: { pageStart: 1, pageEnd: pageCount },
      create: {
        courseId: course.id,
        skillId,
        pageStart: 1,
        pageEnd: pageCount,
      },
    });
  }

  console.log(`Course ready: ${course.name} (${course.id})`);
  return course;
}

async function main() {
  const pdfDir = resolve(PDF_DIR);
  console.log(`PDF dir: ${pdfDir}`);

  await prisma.classLevel.upsert({
    where: { levelName: LOGISTICS_LEVEL },
    update: { active: true, archivedAt: null },
    create: { levelName: LOGISTICS_LEVEL, active: true },
  });

  for (const seed of WEEK2_SEEDS) {
    const pdfPath = resolve(pdfDir, seed.pdfFileName);
    if (!existsSync(pdfPath)) {
      throw new Error(`Missing PDF: ${pdfPath}`);
    }
    console.log(`\n=== ${seed.key}`);
    const ebook = await upsertEbookFromPdf(seed.name, pdfPath);
    await ensureCourse(seed, ebook.id, ebook.pageCount);
  }

  console.log('\nDone — Logistics week 2 seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
