/**
 * Build Lop 9 unit ebooks from skill-specific lesson sources and seed
 * CourseSkillLesson mappings for Units 1–6.
 *
 * Source assets:
 *   py -3 scripts/data/_gen_lop9_skill_lesson_pdfs.py
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-lop9-units-ebook.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-lop9-units-ebook.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-lop9-units-ebook.ts --dry-run
 */
import '../lib/loadEnv';

import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';

import { prisma } from '../lib/db';
import { makeEbookStorageKey, saveEbookFile } from '../lib/ebookStorage';
import {
  ensureLop9Course,
  findLop9CourseByUnit,
  LOP9_LEVEL,
  LOP9_UNIT_COUNT,
  lop9UnitCourseName,
} from '../lib/lop9Units';
import {
  lop9SkillLessonManifestPath,
  orderedLop9SkillLessonEntries,
  type Lop9SkillLessonManifest,
  type Lop9SkillLessonManifestSkillEntry,
} from '../lib/lop9SkillLessons';

type SkillRange = {
  skillId: Lop9SkillLessonManifestSkillEntry['skillId'];
  pageStart: number;
  pageEnd: number;
};

function isDryRun() {
  return process.argv.includes('--dry-run');
}

async function requireManifest(): Promise<Lop9SkillLessonManifest> {
  const manifestPath = lop9SkillLessonManifestPath();
  try {
    await access(manifestPath);
  } catch {
    throw new Error(
      `Missing ${manifestPath}. Run: py -3 scripts/data/_gen_lop9_skill_lesson_pdfs.py`
    );
  }
  return JSON.parse(await readFile(manifestPath, 'utf8')) as Lop9SkillLessonManifest;
}

async function requirePdf(relativePath: string): Promise<Buffer> {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), 'scripts/data', relativePath),
  ];
  for (const absolutePath of candidates) {
    try {
      await access(absolutePath);
      return readFile(absolutePath);
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Missing ${candidates[0]}. Regenerate with _gen_lop9_skill_lesson_pdfs.py`);
}

function ebookTitleForUnit(unit: number) {
  return `Lớp 9 Unit ${unit} — Bài học`;
}

function ebookOriginalNameForUnit(unit: number) {
  return `lop9-unit-${unit}-baihoc.pdf`;
}

async function resolveUnitEbookId(unit: number, pageCount: number, dryRun: boolean): Promise<string> {
  const title = ebookTitleForUnit(unit);
  const originalName = ebookOriginalNameForUnit(unit);
  const existing = await prisma.ebook.findFirst({
    where: {
      archivedAt: null,
      active: true,
      OR: [{ title }, { originalName }],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    if (!dryRun) {
      await prisma.ebook.update({
        where: { id: existing.id },
        data: {
          title,
          originalName,
          pageCount,
          active: true,
          archivedAt: null,
        },
      });
    }
    return existing.id;
  }

  if (dryRun) {
    return `dry-run-lop9-unit-${unit}-ebook`;
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
  return created.id;
}

async function buildCombinedUnitPdf(entries: Lop9SkillLessonManifestSkillEntry[]) {
  const ordered = orderedLop9SkillLessonEntries(entries);
  const out = await PDFDocument.create();
  const skillRanges: SkillRange[] = [];

  for (const entry of ordered) {
    const pdfBytes = await requirePdf(entry.unitPdf);
    const source = await PDFDocument.load(pdfBytes);
    const indices = source.getPageIndices();
    const pages = await out.copyPages(source, indices);
    const pageStart = out.getPageCount() + 1;
    for (const page of pages) {
      out.addPage(page);
    }
    const pageEnd = out.getPageCount();
    skillRanges.push({
      skillId: entry.skillId,
      pageStart,
      pageEnd,
    });
  }

  return {
    bytes: Buffer.from(await out.save()),
    pageCount: out.getPageCount(),
    skillRanges,
  };
}

async function main() {
  const dryRun = isDryRun();
  const manifest = await requireManifest();

  if (!dryRun) {
    await prisma.classLevel.upsert({
      where: { levelName: LOP9_LEVEL },
      update: { active: true, archivedAt: null },
      create: { levelName: LOP9_LEVEL, active: true },
    });
  }

  for (let unit = 1; unit <= LOP9_UNIT_COUNT; unit++) {
    const name = lop9UnitCourseName(unit);
    const manifestUnit = manifest.units[String(unit)];
    if (!manifestUnit?.skills?.length) {
      throw new Error(`Manifest missing skills for Unit ${unit}`);
    }
    const combined = await buildCombinedUnitPdf(manifestUnit.skills);
    const course = dryRun
      ? await findLop9CourseByUnit(prisma, unit)
      : await ensureLop9Course(prisma, unit);
    const courseId = course?.id ?? `dry-run-unit-${unit}`;
    const ebookId = await resolveUnitEbookId(unit, combined.pageCount, dryRun);

    console.log(
      `${dryRun ? '[dry-run] ' : ''}${name} -> ebook ${ebookId} (${combined.pageCount} pages)`
    );
    for (const skillRange of combined.skillRanges) {
      console.log(
        `  ${skillRange.skillId} -> ${skillRange.pageStart}-${skillRange.pageEnd}`
      );
    }

    if (dryRun) continue;

    const storageKey = await saveEbookFile(makeEbookStorageKey(ebookId), combined.bytes);
    await prisma.ebook.update({
      where: { id: ebookId },
      data: {
        storageKey,
        pageCount: combined.pageCount,
        active: true,
        archivedAt: null,
        title: ebookTitleForUnit(unit),
        originalName: ebookOriginalNameForUnit(unit),
      },
    });

    await prisma.course.update({
      where: { id: courseId },
      data: {
        name,
        active: true,
        ebookFileId: ebookId,
        ebookPageStart: 1,
        ebookPageEnd: combined.pageCount,
      },
    });

    const manifestSkillIds = combined.skillRanges.map((item) => item.skillId);
    await prisma.courseSkillLesson.deleteMany({
      where: {
        courseId,
        skillId: { notIn: manifestSkillIds },
      },
    });

    for (const skillRange of combined.skillRanges) {
      await prisma.courseSkillLesson.upsert({
        where: {
          courseId_skillId: {
            courseId,
            skillId: skillRange.skillId,
          },
        },
        update: {
          pageStart: skillRange.pageStart,
          pageEnd: skillRange.pageEnd,
        },
        create: {
          courseId,
          skillId: skillRange.skillId,
          pageStart: skillRange.pageStart,
          pageEnd: skillRange.pageEnd,
        },
      });
    }
  }

  console.log(
    `Done${dryRun ? ' (dry-run)' : ''}: mapped ${LOP9_LEVEL} Units 1-${LOP9_UNIT_COUNT} to skill-specific lesson ebooks.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
