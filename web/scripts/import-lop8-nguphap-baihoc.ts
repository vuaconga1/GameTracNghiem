/**
 * Import Lớp 8 Reading + Listening skill “Bài học” pages from NguPhap_Lop8.docx.
 *
 * Source: scripts/data/nguphap-baihoc-lop8/pdfs/unit-{1..6}.pdf (2 pages each)
 * Regenerate assets:
 *   py -3 scripts/data/_gen_lop8_nguphap_baihoc_pdfs.py
 *
 * Strategy (preserves existing speaking / vocabulary CourseSkillLesson):
 *   - Append 2 grammar theory pages to the unit ebook once
 *   - reading → pageStart=N, pageEnd=N+1
 *   - listening → same range (both skills show grammar theory content)
 *   - Re-run: if reading already mapped to a 2-page range, refresh those pages
 *     (keeps speaking/vocab pages intact)
 *   - Ensures `reading` and `listening` are in enabledSkills
 *
 * Expected after import:
 *   Unit 1: speaking 6, vocabulary 7, reading/listening 8–9
 *   Units 2–6: speaking 1, vocabulary 2, reading/listening 3–4
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-nguphap-baihoc.ts
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
const SKILL_READING = 'reading' as const;
const SKILL_LISTENING = 'listening' as const;
const SKILL_SPEAKING = 'speaking' as const;
const SKILL_VOCAB = 'vocabulary' as const;
const PDF_DIR = resolve(process.cwd(), 'scripts/data/nguphap-baihoc-lop8/pdfs');

async function requireUnitPdf(unit: number): Promise<Buffer> {
  const path = resolve(PDF_DIR, `unit-${unit}.pdf`);
  try {
    await access(path);
  } catch {
    throw new Error(
      `Missing ${path}. Run: py -3 scripts/data/_gen_lop8_nguphap_baihoc_pdfs.py`,
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

async function ensureSkillsEnabled(courseId: string, skills: string[]) {
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
  let changed = false;
  for (const skill of skills) {
    if (!enabledSet.has(skill as (typeof SKILL_IDS)[number])) {
      enabledSet.add(skill as (typeof SKILL_IDS)[number]);
      changed = true;
      console.log(`  enabledSkills += ${skill}`);
    }
  }
  if (!changed) return;

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
}

async function upsertLessonRange(
  courseId: string,
  skillId: string,
  pageStart: number,
  pageEnd: number,
) {
  await prisma.courseSkillLesson.upsert({
    where: { courseId_skillId: { courseId, skillId } },
    update: { pageStart, pageEnd },
    create: { courseId, skillId, pageStart, pageEnd },
  });
}

async function getLesson(courseId: string, skillId: string) {
  return prisma.courseSkillLesson.findUnique({
    where: { courseId_skillId: { courseId, skillId } },
  });
}

/**
 * Append (or refresh) 2 grammar pages at the end of the unit ebook.
 * Never rewrites pages before pageStart (speaking/vocab stay intact).
 */
async function appendOrRefreshGrammarPages(params: {
  courseId: string;
  ebookId: string;
  grammarPdf: Buffer;
}): Promise<{ pageStart: number; pageEnd: number; refreshed: boolean }> {
  const ebook = await prisma.ebook.findUniqueOrThrow({ where: { id: params.ebookId } });
  const existingReading = await getLesson(params.courseId, SKILL_READING);
  const existingListening = await getLesson(params.courseId, SKILL_LISTENING);
  const speaking = await getLesson(params.courseId, SKILL_SPEAKING);
  const vocab = await getLesson(params.courseId, SKILL_VOCAB);

  const existingBytes = await bufferFromEbookStorage(ebook.storageKey);
  const baseDoc = await PDFDocument.load(existingBytes);
  const basePages = baseDoc.getPageCount();

  const grammarDoc = await PDFDocument.load(params.grammarPdf);
  const grammarPageCount = grammarDoc.getPageCount();
  if (grammarPageCount !== 2) {
    throw new Error(`Expected 2-page grammar PDF, got ${grammarPageCount}`);
  }

  // Re-run path: reading already points at a 2-page grammar block.
  const existingRange =
    existingReading &&
    existingReading.pageEnd === existingReading.pageStart + 1 &&
    existingReading.pageStart > 0
      ? existingReading
      : existingListening &&
          existingListening.pageEnd === existingListening.pageStart + 1 &&
          existingListening.pageStart > 0
        ? existingListening
        : null;

  if (existingRange) {
    const pageStart = existingRange.pageStart;
    const pageEnd = existingRange.pageEnd;
    const keepCount = Math.min(basePages, pageStart - 1);

    // Safety: grammar pages must sit after speaking/vocab pages.
    const maxProtected = Math.max(
      speaking?.pageEnd ?? 0,
      vocab?.pageEnd ?? 0,
    );
    if (pageStart <= maxProtected) {
      throw new Error(
        `Refusing to overwrite protected pages: grammar starts at ${pageStart} but speaking/vocab end at ${maxProtected}`,
      );
    }

    const refreshed = await PDFDocument.create();
    for (let i = 0; i < keepCount; i++) {
      const [copied] = await refreshed.copyPages(baseDoc, [i]);
      refreshed.addPage(copied);
    }
    const grammarCopied = await refreshed.copyPages(grammarDoc, [0, 1]);
    for (const page of grammarCopied) {
      refreshed.addPage(page);
    }

    const merged = Buffer.from(await refreshed.save());
    const newPageCount = refreshed.getPageCount();
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
    if (vocab) {
      console.log(`  preserved vocabulary → ${vocab.pageStart}–${vocab.pageEnd}`);
    }
    console.log(
      `  refreshed grammar pages ${pageStart}–${pageEnd} (ebook pages=${newPageCount})`,
    );
    return { pageStart, pageEnd, refreshed: true };
  }

  // First-run: append 2 pages after current end.
  const pageStart = basePages + 1;
  const pageEnd = basePages + 2;

  const grammarCopied = await baseDoc.copyPages(grammarDoc, [0, 1]);
  for (const page of grammarCopied) {
    baseDoc.addPage(page);
  }
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
  if (vocab) {
    console.log(`  preserved vocabulary → ${vocab.pageStart}–${vocab.pageEnd}`);
  }
  console.log(
    `  appended grammar → pages ${pageStart}–${pageEnd} of ebook "${ebook.title}" (${ebook.id})`,
  );
  return { pageStart, pageEnd, refreshed: false };
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

  if (!row.ebookFileId) {
    console.log(`\n=== ${row.name}: no ebook — skip (run speaking/vocab import first) ===`);
    return;
  }

  const pdfBytes = await requireUnitPdf(unit);
  console.log(`\n=== ${row.name} (${row.id}) — ${LOP8_UNIT_TITLES[unit]} ===`);

  await ensureSkillsEnabled(row.id, [SKILL_READING, SKILL_LISTENING]);

  const result = await appendOrRefreshGrammarPages({
    courseId: row.id,
    ebookId: row.ebookFileId,
    grammarPdf: pdfBytes,
  });

  await upsertLessonRange(row.id, SKILL_READING, result.pageStart, result.pageEnd);
  await upsertLessonRange(row.id, SKILL_LISTENING, result.pageStart, result.pageEnd);

  const ebook = await prisma.ebook.findUniqueOrThrow({
    where: { id: row.ebookFileId },
    select: { pageCount: true },
  });

  // Keep course-level default range covering full skill ebook when it was set (Units 2–6).
  if (row.ebookPageStart != null || row.ebookPageEnd != null) {
    await prisma.course.update({
      where: { id: row.id },
      data: {
        ebookPageStart: row.ebookPageStart ?? 1,
        ebookPageEnd: ebook.pageCount,
      },
    });
  }

  console.log(
    `  CourseSkillLesson reading → ${result.pageStart}–${result.pageEnd}`,
  );
  console.log(
    `  CourseSkillLesson listening → ${result.pageStart}–${result.pageEnd}`,
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
