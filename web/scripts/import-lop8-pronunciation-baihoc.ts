/**
 * Import Lớp 8 Speaking skill “Bài học” pages from Pronuncation_Baihoc_Lop8.docx.
 *
 * Source: scripts/data/pronunciation-baihoc-lop8/pdfs/unit-{1..6}.pdf
 * Regenerate assets:
 *   python scripts/data/_gen_lop8_pronunciation_baihoc_pdfs.py
 *
 * Strategy:
 *   - Units without ebook → attach 1-page pronunciation PDF; speaking pages 1–1
 *   - Unit with existing ebook → append pronunciation as last page (once);
 *     speaking pages = last page
 *   - Ensures `speaking` is in enabledSkills
 *   - Does NOT touch pronunciation game questions
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-pronunciation-baihoc.ts
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
const SKILL = 'speaking' as const;
const PDF_DIR = resolve(process.cwd(), 'scripts/data/pronunciation-baihoc-lop8/pdfs');

function ebookTitleForUnit(unit: number): string {
  return `Lớp 8 Unit ${unit} — Pronunciation Bài học`;
}

async function requireUnitPdf(unit: number): Promise<Buffer> {
  const path = resolve(PDF_DIR, `unit-${unit}.pdf`);
  try {
    await access(path);
  } catch {
    throw new Error(
      `Missing ${path}. Run: python scripts/data/_gen_lop8_pronunciation_baihoc_pdfs.py`,
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

async function ensureSpeakingEnabled(courseId: string) {
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
  if (enabledSet.has(SKILL)) return;

  enabledSet.add(SKILL);
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
  console.log(`  enabledSkills += speaking`);
}

async function upsertSpeakingLesson(courseId: string, page: number) {
  await prisma.courseSkillLesson.upsert({
    where: { courseId_skillId: { courseId, skillId: SKILL } },
    update: { pageStart: page, pageEnd: page },
    create: { courseId, skillId: SKILL, pageStart: page, pageEnd: page },
  });
}

async function createOrUpdateStandaloneEbook(unit: number, pdfBytes: Buffer) {
  const title = ebookTitleForUnit(unit);
  const existing = await prisma.ebook.findFirst({
    where: { title, archivedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const storageKey = await saveEbookFile(makeEbookStorageKey(existing.id), pdfBytes);
    const updated = await prisma.ebook.update({
      where: { id: existing.id },
      data: {
        storageKey,
        pageCount: 1,
        active: true,
        archivedAt: null,
        originalName: `unit-${unit}-pronunciation-baihoc.pdf`,
      },
    });
    return updated;
  }

  const created = await prisma.ebook.create({
    data: {
      title,
      originalName: `unit-${unit}-pronunciation-baihoc.pdf`,
      storageKey: 'pending.pdf',
      pageCount: 1,
      active: true,
    },
  });
  const storageKey = await saveEbookFile(makeEbookStorageKey(created.id), pdfBytes);
  return prisma.ebook.update({
    where: { id: created.id },
    data: { storageKey },
  });
}

/**
 * Append pronunciation page to an existing unit ebook once.
 * Detects prior append via speaking skill lesson pointing at last page when pageCount > original baseline.
 */
async function refreshStandalonePronunciationEbook(
  ebookId: string,
  pdfBytes: Buffer,
): Promise<void> {
  const storageKey = await saveEbookFile(makeEbookStorageKey(ebookId), pdfBytes);
  await prisma.ebook.update({
    where: { id: ebookId },
    data: {
      storageKey,
      pageCount: 1,
      active: true,
      archivedAt: null,
    },
  });
}

async function appendPronunciationPage(params: {
  courseId: string;
  ebookId: string;
  pronunciationPdf: Buffer;
  unit: number;
}): Promise<{ page: number; appended: boolean }> {
  const ebook = await prisma.ebook.findUniqueOrThrow({ where: { id: params.ebookId } });
  const existingLesson = await prisma.courseSkillLesson.findUnique({
    where: {
      courseId_skillId: { courseId: params.courseId, skillId: SKILL },
    },
  });

  // Dedicated skill ebooks (Units 2–6): refresh pronunciation as page 1.
  // After vocabulary import, title may be "— Bài học" with pageCount 2 — keep extra pages.
  if (
    ebook.title.includes('Pronunciation Bài học') ||
    ebook.title.includes('— Bài học')
  ) {
    const pageCount = ebook.pageCount ?? 0;
    if (pageCount > 1) {
      const existingBytes = await bufferFromEbookStorage(ebook.storageKey);
      const baseDoc = await PDFDocument.load(existingBytes);
      const basePages = baseDoc.getPageCount();
      const refreshed = await PDFDocument.create();
      const pronDoc = await PDFDocument.load(params.pronunciationPdf);
      const [pronPage] = await refreshed.copyPages(pronDoc, [0]);
      refreshed.addPage(pronPage);
      for (let i = 1; i < basePages; i++) {
        const [copied] = await refreshed.copyPages(baseDoc, [i]);
        refreshed.addPage(copied);
      }
      const merged = Buffer.from(await refreshed.save());
      const storageKey = await saveEbookFile(makeEbookStorageKey(ebook.id), merged);
      await prisma.ebook.update({
        where: { id: ebook.id },
        data: {
          storageKey,
          pageCount: basePages,
          active: true,
          archivedAt: null,
        },
      });
      console.log(
        `  refreshed pronunciation page 1 in ${basePages}-page ebook (${ebook.id})`,
      );
      return { page: 1, appended: false };
    }

    await refreshStandalonePronunciationEbook(ebook.id, params.pronunciationPdf);
    console.log(`  refreshed standalone pronunciation ebook (${ebook.id})`);
    return { page: 1, appended: false };
  }

  const pageCount = ebook.pageCount ?? 0;
  if (
    existingLesson &&
    existingLesson.pageStart === existingLesson.pageEnd &&
    pageCount > 0 &&
    existingLesson.pageStart === pageCount
  ) {
    console.log(`  speaking already at page ${pageCount} — skip append`);
    return { page: pageCount, appended: false };
  }

  const existingBytes = await bufferFromEbookStorage(ebook.storageKey);
  const baseDoc = await PDFDocument.load(existingBytes);
  const basePages = baseDoc.getPageCount();

  if (
    existingLesson &&
    existingLesson.pageStart === basePages &&
    existingLesson.pageEnd === basePages
  ) {
    await prisma.ebook.update({
      where: { id: ebook.id },
      data: { pageCount: basePages, active: true, archivedAt: null },
    });
    return { page: basePages, appended: false };
  }

  const addDoc = await PDFDocument.load(params.pronunciationPdf);
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

  console.log(
    `  appended pronunciation → page ${newPageCount} of ebook "${ebook.title}" (${ebook.id})`,
  );
  return { page: newPageCount, appended: true };
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

  await ensureSpeakingEnabled(row.id);

  let speakingPage = 1;
  let ebookId: string;

  if (row.ebookFileId) {
    const result = await appendPronunciationPage({
      courseId: row.id,
      ebookId: row.ebookFileId,
      pronunciationPdf: pdfBytes,
      unit,
    });
    speakingPage = result.page;
    ebookId = row.ebookFileId;
  } else {
    const ebook = await createOrUpdateStandaloneEbook(unit, pdfBytes);
    ebookId = ebook.id;
    speakingPage = 1;
    await prisma.course.update({
      where: { id: row.id },
      data: {
        ebookFileId: ebook.id,
        // Unit default Bài học = this single pronunciation page until other skills get pages.
        ebookPageStart: 1,
        ebookPageEnd: 1,
      },
    });
    console.log(`  attached ebook ${ebook.id} (${ebook.title})`);
  }

  await upsertSpeakingLesson(row.id, speakingPage);
  console.log(`  CourseSkillLesson speaking → ${speakingPage}–${speakingPage} (ebook ${ebookId})`);
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
