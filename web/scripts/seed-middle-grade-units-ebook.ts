/**
 * Seed Lớp 6/7 unit lesson ebooks from sliced skill PDFs + CourseSkillLesson.
 *
 * Generate first:
 *   py -3 scripts/data/_gen_middle_grade_skill_lesson_pdfs.py --all
 *
 * Usage (from web/):
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-middle-grade-units-ebook.ts --grade 6
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-middle-grade-units-ebook.ts --all
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-middle-grade-units-ebook.ts --grade 7 --dry-run
 */
import '../lib/loadEnv';

import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';

import { prisma } from '../lib/db';
import { makeEbookStorageKey, saveEbookFile } from '../lib/ebookStorage';
import {
  ensureLop6Course,
  LOP6_LEVEL,
  LOP6_UNIT_COUNT,
  lop6UnitCourseName,
} from '../lib/lop6Units';
import {
  ensureLop7Course,
  LOP7_LEVEL,
  LOP7_UNIT_COUNT,
  lop7UnitCourseName,
} from '../lib/lop7Units';

type SkillId = 'vocabulary' | 'writing' | 'speaking' | 'reading' | 'listening';

type ManifestSkillEntry = {
  skillId: SkillId;
  sourcePdf: string;
  unitPdf: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  pageCount: number;
};

type Manifest = {
  generatedAt: string;
  sourcePdf: string;
  units: Record<string, { unit: number; skills: ManifestSkillEntry[] }>;
};

type SkillRange = { skillId: SkillId; pageStart: number; pageEnd: number };

const SKILL_ORDER: SkillId[] = ['vocabulary', 'writing', 'speaking', 'reading'];

function isDryRun() {
  return process.argv.includes('--dry-run');
}

function parseGrades(): number[] {
  if (process.argv.includes('--all')) return [6, 7];
  const idx = process.argv.indexOf('--grade');
  if (idx < 0) return [6, 7];
  const n = Number(process.argv[idx + 1]);
  if (n !== 6 && n !== 7) throw new Error('Use --grade 6|7 or --all');
  return [n];
}

function gradeConfig(grade: number) {
  if (grade === 6) {
    return {
      level: LOP6_LEVEL,
      unitCount: LOP6_UNIT_COUNT,
      courseName: lop6UnitCourseName,
      ensureCourse: ensureLop6Course,
      manifestRel: 'scripts/data/lop6-skill-lessons/manifest.json',
      ebookTitle: (u: number) => `Lớp 6 Unit ${u} — Bài học`,
      ebookOriginal: (u: number) => `lop6-unit-${u}-baihoc.pdf`,
      genHint: 'py -3 scripts/data/_gen_middle_grade_skill_lesson_pdfs.py --grade 6',
    };
  }
  return {
    level: LOP7_LEVEL,
    unitCount: LOP7_UNIT_COUNT,
    courseName: lop7UnitCourseName,
    ensureCourse: ensureLop7Course,
    manifestRel: 'scripts/data/lop7-skill-lessons/manifest.json',
    ebookTitle: (u: number) => `Lớp 7 Unit ${u} — Bài học`,
    ebookOriginal: (u: number) => `lop7-unit-${u}-baihoc.pdf`,
    genHint: 'py -3 scripts/data/_gen_middle_grade_skill_lesson_pdfs.py --grade 7',
  };
}

function orderSkills(entries: ManifestSkillEntry[]) {
  const rank = (id: string) => {
    const i = SKILL_ORDER.indexOf(id as SkillId);
    return i >= 0 ? i : 99;
  };
  return [...entries].sort((a, b) => rank(a.skillId) - rank(b.skillId));
}

async function requireManifest(rel: string, genHint: string): Promise<Manifest> {
  const path = resolve(process.cwd(), rel);
  try {
    await access(path);
  } catch {
    throw new Error(`Missing ${path}. Run: ${genHint}`);
  }
  return JSON.parse(await readFile(path, 'utf8')) as Manifest;
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
      // next
    }
  }
  throw new Error(`Missing PDF ${relativePath}`);
}

async function resolveUnitEbookId(
  title: string,
  originalName: string,
  pageCount: number,
  dryRun: boolean,
): Promise<string> {
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
        data: { title, originalName, pageCount, active: true, archivedAt: null },
      });
    }
    return existing.id;
  }
  if (dryRun) return `dry-run-${originalName}`;
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

async function buildCombinedUnitPdf(entries: ManifestSkillEntry[]) {
  const ordered = orderSkills(entries);
  const out = await PDFDocument.create();
  const skillRanges: SkillRange[] = [];

  for (const entry of ordered) {
    const pdfBytes = await requirePdf(entry.unitPdf);
    const source = await PDFDocument.load(pdfBytes);
    const pages = await out.copyPages(source, source.getPageIndices());
    const pageStart = out.getPageCount() + 1;
    for (const page of pages) out.addPage(page);
    skillRanges.push({
      skillId: entry.skillId,
      pageStart,
      pageEnd: out.getPageCount(),
    });
  }

  return {
    bytes: Buffer.from(await out.save()),
    pageCount: out.getPageCount(),
    skillRanges,
  };
}

async function seedGrade(grade: number, dryRun: boolean) {
  const cfg = gradeConfig(grade);
  const manifest = await requireManifest(cfg.manifestRel, cfg.genHint);

  if (!dryRun) {
    await prisma.classLevel.upsert({
      where: { levelName: cfg.level },
      update: { active: true, archivedAt: null },
      create: { levelName: cfg.level, active: true },
    });
  }

  console.log(`\n=== Seed ${cfg.level} lesson ebooks ===`);

  for (let unit = 1; unit <= cfg.unitCount; unit++) {
    const name = cfg.courseName(unit);
    const manifestUnit = manifest.units[String(unit)];
    if (!manifestUnit?.skills?.length) {
      throw new Error(`Manifest missing skills for ${cfg.level} Unit ${unit}`);
    }
    const combined = await buildCombinedUnitPdf(manifestUnit.skills);
    const course = dryRun ? null : await cfg.ensureCourse(prisma, unit);
    const courseId = course?.id ?? `dry-run-unit-${unit}`;
    const title = cfg.ebookTitle(unit);
    const originalName = cfg.ebookOriginal(unit);
    const ebookId = await resolveUnitEbookId(title, originalName, combined.pageCount, dryRun);

    console.log(`${dryRun ? '[dry-run] ' : ''}${name} -> ebook ${ebookId} (${combined.pageCount} pages)`);
    for (const skillRange of combined.skillRanges) {
      console.log(`  ${skillRange.skillId} -> ${skillRange.pageStart}-${skillRange.pageEnd}`);
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
        title,
        originalName,
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
      where: { courseId, skillId: { notIn: manifestSkillIds } },
    });

    for (const skillRange of combined.skillRanges) {
      await prisma.courseSkillLesson.upsert({
        where: {
          courseId_skillId: { courseId, skillId: skillRange.skillId },
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

  console.log(`Done${dryRun ? ' (dry-run)' : ''}: ${cfg.level} Units 1-${cfg.unitCount}`);
}

async function main() {
  const dryRun = isDryRun();
  for (const grade of parseGrades()) {
    await seedGrade(grade, dryRun);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
