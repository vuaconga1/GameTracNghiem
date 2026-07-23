/**
 * Import Lớp 8 Vocabulary skill “Bài học” pages from Tuvung_Lop8.docx.
 *
 * Source: scripts/data/tuvung-baihoc-lop8/pdfs/unit-{1..6}.pdf
 * Regenerate assets:
 *   py -3 scripts/data/_gen_lop8_tuvung_baihoc_pdfs.py
 *
 * Strategy (preserves existing `speaking` CourseSkillLesson):
 *   - Unit 1 (multi-page unit ebook): append vocabulary as last page once;
 *     speaking stays on its current page; vocabulary = last page
 *   - Units 2–6 (standalone pronunciation 1-page ebooks): rebuild as
 *     2-page PDF [pronunciation | vocabulary]; speaking→1, vocabulary→2
 *   - Ensures `vocabulary` is in enabledSkills
 *   - Does NOT overwrite speaking page mappings
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-tuvung-baihoc.ts
 */
import '../lib/loadEnv';

import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';
import { makeEbookStorageKey, openEbookFile, saveEbookFile } from '../lib/ebookStorage';
import { findLop8CourseByUnit, LOP8_LEVEL, LOP8_UNIT_TITLES } from '../lib/lop8Units';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  resolveEnabledSkillIds,
  SKILL_IDS,
} from '../lib/skillCatalog';

const UNITS = [1, 2, 3, 4, 5, 6] as const;
const SKILL_VOCAB = 'vocabulary' as const;
const SKILL_SPEAKING = 'speaking' as const;
const PDF_DIR = resolve(process.cwd(), 'scripts/data/tuvung-baihoc-lop8/pdfs');
const PRON_PDF_DIR = resolve(process.cwd(), 'scripts/data/pronunciation-baihoc-lop8/pdfs');

function combinedEbookTitle(unit: number): string {
  return `Lớp 8 Unit ${unit} — Bài học`;
}

async function requireUnitPdf(unit: number): Promise<Buffer> {
  const path = resolve(PDF_DIR, `unit-${unit}.pdf`);
  try {
    await access(path);
  } catch {
    throw new Error(
      `Missing ${path}. Run: py -3 scripts/data/_gen_lop8_tuvung_baihoc_pdfs.py`,
    );
  }
  return readFile(path);
}

async function requirePronunciationPdf(unit: number): Promise<Buffer> {
  const path = resolve(PRON_PDF_DIR, `unit-${unit}.pdf`);
  try {
    await access(path);
  } catch {
    throw new Error(
      `Missing pronunciation PDF ${path}. Needed to rebuild Units 2–6 combined ebook.`,
    );
  }
  return readFile(path);
}

async function bufferFromEbookStorage(storageKey: string): Promise<Buffer> {
  const opened = await openEbookFile(storageKey);
  if (!opened) {
    throw new Error(`Cannot open ebook storage: ${storageKey}`);
  }
  if (Buffer.isBuffer(opened.body)) {
    return opened.body;
  }
  const reader = (opened.body as ReadableStream).getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

async function ensureVocabularyEnabled(courseId: string) {
  const row = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      enabledSkills: true,
      enabledGames: true,
      gameSkills: true,
    },
  });
  if (!row) return;

  const enabledSet = new Set(resolveEnabledSkillIds(row.enabledSkills));
  if (enabledSet.has(SKILL_VOCAB)) return;

  enabledSet.add(SKILL_VOCAB);
  const enabledSkills = SKILL_IDS.filter((id) => enabledSet.has(id));
  const map = normalizeGameSkillsMap(row.gameSkills);
  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, row.enabledGames);
  await prisma.course.update({
    where: { id: courseId },
    data: {
      enabledSkills,
      enabledGames,
      gameSkills: map as Prisma.InputJsonValue,
    },
  });
  console.log(`  enabledSkills += vocabulary`);
}

async function upsertVocabularyLesson(courseId: string, page: number) {
  await prisma.courseSkillLesson.upsert({
    where: { courseId_skillId: { courseId, skillId: SKILL_VOCAB } },
    update: { pageStart: page, pageEnd: page },
    create: { courseId, skillId: SKILL_VOCAB, pageStart: page, pageEnd: page },
  });
}

async function getSpeakingLesson(courseId: string) {
  return prisma.courseSkillLesson.findUnique({
    where: { courseId_skillId: { courseId, skillId: SKILL_SPEAKING } },
  });
}

async function getVocabularyLesson(courseId: string) {
  return prisma.courseSkillLesson.findUnique({
    where: { courseId_skillId: { courseId, skillId: SKILL_VOCAB } },
  });
}

function isStandaloneSkillEbook(title: string): boolean {
  return (
    title.includes('Pronunciation Bài học') ||
    title.includes('— Bài học') ||
    title.includes('Vocabulary Bài học')
  );
}

async function mergeTwoPages(page1: Buffer, page2: Buffer): Promise<Buffer> {
  const out = await PDFDocument.create();
  const doc1 = await PDFDocument.load(page1);
  const doc2 = await PDFDocument.load(page2);
  const [p1] = await out.copyPages(doc1, [0]);
  const [p2] = await out.copyPages(doc2, [0]);
  out.addPage(p1);
  out.addPage(p2);
  return Buffer.from(await out.save());
}

/**
 * Units 2–6: rebuild course ebook as pronunciation (p1) + vocabulary (p2).
 * Speaking stays mapped to page 1.
 */
async function rebuildCombinedStandaloneEbook(params: {
  courseId: string;
  ebookId: string;
  unit: number;
  vocabularyPdf: Buffer;
}): Promise<{ vocabPage: number; speakingPage: number }> {
  const ebook = await prisma.ebook.findUniqueOrThrow({ where: { id: params.ebookId } });
  const speaking = await getSpeakingLesson(params.courseId);
  const speakingPage = speaking?.pageStart && speaking.pageStart > 0 ? speaking.pageStart : 1;

  if (speaking && speaking.pageStart !== 1) {
    console.warn(
      `  warning: speaking was at page ${speaking.pageStart}; combined rebuild keeps speaking→1`,
    );
  }

  const pronunciationPdf = await requirePronunciationPdf(params.unit);
  const merged = await mergeTwoPages(pronunciationPdf, params.vocabularyPdf);
  const storageKey = await saveEbookFile(makeEbookStorageKey(ebook.id), merged);

  await prisma.ebook.update({
    where: { id: ebook.id },
    data: {
      storageKey,
      pageCount: 2,
      active: true,
      archivedAt: null,
      title: combinedEbookTitle(params.unit),
      originalName: `unit-${params.unit}-baihoc.pdf`,
    },
  });

  // Keep speaking at page 1 (do not wipe the row; upsert only if missing).
  if (!speaking) {
    await prisma.courseSkillLesson.create({
      data: {
        courseId: params.courseId,
        skillId: SKILL_SPEAKING,
        pageStart: 1,
        pageEnd: 1,
      },
    });
    console.log(`  created missing speaking lesson → 1–1`);
  } else if (speaking.pageStart !== 1 || speaking.pageEnd !== 1) {
    await prisma.courseSkillLesson.update({
      where: { courseId_skillId: { courseId: params.courseId, skillId: SKILL_SPEAKING } },
      data: { pageStart: 1, pageEnd: 1 },
    });
    console.log(`  normalized speaking → 1–1 (was ${speaking.pageStart}–${speaking.pageEnd})`);
  } else {
    console.log(`  preserved speaking → 1–1`);
  }

  await prisma.course.update({
    where: { id: params.courseId },
    data: {
      ebookPageStart: 1,
      ebookPageEnd: 2,
    },
  });

  console.log(
    `  rebuilt combined ebook "${combinedEbookTitle(params.unit)}" (${ebook.id}) pages=2`,
  );
  return { vocabPage: 2, speakingPage: 1 };
}

/**
 * Unit 1: append vocabulary once to the multi-page unit ebook.
 */
async function appendVocabularyToUnitEbook(params: {
  courseId: string;
  ebookId: string;
  vocabularyPdf: Buffer;
}): Promise<{ vocabPage: number }> {
  const ebook = await prisma.ebook.findUniqueOrThrow({ where: { id: params.ebookId } });
  const existingVocab = await getVocabularyLesson(params.courseId);
  const speaking = await getSpeakingLesson(params.courseId);

  const existingBytes = await bufferFromEbookStorage(ebook.storageKey);
  const baseDoc = await PDFDocument.load(existingBytes);
  const basePages = baseDoc.getPageCount();

  // Already mapped: keep speaking page, set/replace vocabulary page (handles blob lag).
  if (
    existingVocab &&
    existingVocab.pageStart === existingVocab.pageEnd &&
    (!speaking || speaking.pageStart < existingVocab.pageStart)
  ) {
    const targetPage = existingVocab.pageStart;
    const refreshed = await PDFDocument.create();
    const keepCount = Math.min(basePages, targetPage - 1);
    for (let i = 0; i < keepCount; i++) {
      const [copied] = await refreshed.copyPages(baseDoc, [i]);
      refreshed.addPage(copied);
    }
    const addDoc = await PDFDocument.load(params.vocabularyPdf);
    const [vocabCopied] = await refreshed.copyPages(addDoc, [0]);
    refreshed.addPage(vocabCopied);
    const merged = Buffer.from(await refreshed.save());
    const storageKey = await saveEbookFile(makeEbookStorageKey(ebook.id), merged);
    await prisma.ebook.update({
      where: { id: ebook.id },
      data: {
        storageKey,
        pageCount: targetPage,
        active: true,
        archivedAt: null,
      },
    });
    if (speaking) {
      console.log(`  preserved speaking → ${speaking.pageStart}–${speaking.pageEnd}`);
    }
    console.log(`  refreshed vocabulary page ${targetPage} (already mapped)`);
    return { vocabPage: targetPage };
  }

  const addDoc = await PDFDocument.load(params.vocabularyPdf);
  const [copied] = await baseDoc.copyPages(addDoc, [0]);
  baseDoc.addPage(copied);
  const merged = Buffer.from(await baseDoc.save());
  const newPageCount = baseDoc.getPageCount();

  const storageKey = await saveEbookFile(makeEbookStorageKey(ebook.id), merged);
  await prisma.ebook.update({
    where: { id: ebook.id },
    data: {
      storageKey,
      pageCount: newPageCount,
      active: true,
      archivedAt: null,
    },
  });

  if (speaking) {
    console.log(`  preserved speaking → ${speaking.pageStart}–${speaking.pageEnd}`);
  }
  console.log(
    `  appended vocabulary → page ${newPageCount} of ebook "${ebook.title}" (${ebook.id})`,
  );
  return { vocabPage: newPageCount };
}

async function importUnit(unit: number) {
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    console.log(`\n=== ${LOP8_LEVEL} Unit ${unit}: course missing — skip ===`);
    return;
  }

  const row = await prisma.course.findUnique({
    where: { id: course.id },
    select: {
      id: true,
      name: true,
      ebookFileId: true,
      ebookPageStart: true,
      ebookPageEnd: true,
    },
  });
  if (!row) return;

  const pdfBytes = await requireUnitPdf(unit);
  console.log(`\n=== ${row.name} (${row.id}) — ${LOP8_UNIT_TITLES[unit]} ===`);

  await ensureVocabularyEnabled(row.id);

  if (!row.ebookFileId) {
    // No ebook yet: create 1-page vocabulary-only (unlikely for Lớp 8 after speaking import).
    const created = await prisma.ebook.create({
      data: {
        title: `Lớp 8 Unit ${unit} — Vocabulary Bài học`,
        originalName: `unit-${unit}-vocabulary-baihoc.pdf`,
        storageKey: 'pending.pdf',
        pageCount: 1,
        active: true,
      },
    });
    const storageKey = await saveEbookFile(makeEbookStorageKey(created.id), pdfBytes);
    await prisma.ebook.update({
      where: { id: created.id },
      data: { storageKey },
    });
    await prisma.course.update({
      where: { id: row.id },
      data: {
        ebookFileId: created.id,
        ebookPageStart: 1,
        ebookPageEnd: 1,
      },
    });
    await upsertVocabularyLesson(row.id, 1);
    console.log(`  attached vocabulary-only ebook ${created.id}; vocabulary → 1–1`);
    return;
  }

  const ebook = await prisma.ebook.findUniqueOrThrow({ where: { id: row.ebookFileId } });
  let vocabPage: number;

  if (isStandaloneSkillEbook(ebook.title)) {
    // Units 2–6: rebuild [pronunciation | vocabulary]; speaking stays page 1.
    const result = await rebuildCombinedStandaloneEbook({
      courseId: row.id,
      ebookId: row.ebookFileId,
      unit,
      vocabularyPdf: pdfBytes,
    });
    vocabPage = result.vocabPage;
  } else {
    // Unit 1 multi-page ebook (e.g. "8_unit1"): append vocab as last page.
    const result = await appendVocabularyToUnitEbook({
      courseId: row.id,
      ebookId: row.ebookFileId,
      vocabularyPdf: pdfBytes,
    });
    vocabPage = result.vocabPage;
  }

  await upsertVocabularyLesson(row.id, vocabPage);
  console.log(
    `  CourseSkillLesson vocabulary → ${vocabPage}–${vocabPage} (ebook ${row.ebookFileId})`,
  );
}

async function main() {
  for (const unit of UNITS) {
    await importUnit(unit);
  }
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
