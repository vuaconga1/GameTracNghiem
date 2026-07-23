/**
 * Lớp 4 Unit 1–19: gắn ebook Global success 4 + page range cho scramble/grammar.
 * Unit N → trang N–N (cả 2 game). Giữ Unit 1–11 đã có; tạo thêm 12–19.
 *
 * Usage: node scripts/run-with-env.mjs neon -- tsx scripts/seed-lop4-units-ebook.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  findLop4CourseByUnit,
  LOP4_LEVEL,
  LOP4_UNIT_COUNT,
  lop4UnitCourseName,
} from '../lib/lop4Units';

const LEVEL = LOP4_LEVEL;
const UNIT_COUNT = LOP4_UNIT_COUNT;
const GAME_KEYS = ['scramble', 'grammar'] as const;
const EBOOK_TITLE_HINT = 'Global success 4';

/** Known ebook already on Vercel Blob (from local admin upload). */
const KNOWN_EBOOK = {
  id: 'cmrvhg2f9000qr4x5q2a1defg',
  title: 'Global success 4 Từ Vựng + Grammar',
  originalName: 'Global success 4 Từ Vựng + Grammar.pdf',
  storageKey:
    'https://wkvgrlf6rle4ajqz.private.blob.vercel-storage.com/ebooks/cmrvhg2f9000qr4x5q2a1defg.pdf',
} as const;

function unitName(n: number): string {
  return lop4UnitCourseName(n);
}

async function resolveEbookId(): Promise<string> {
  const unit1 = await findLop4CourseByUnit(prisma, 1);
  const linked = unit1
    ? await prisma.course.findFirst({
        where: {
          id: unit1.id,
          archivedAt: null,
          ebookFileId: { not: null },
        },
        select: { ebookFileId: true },
      })
    : null;
  if (linked?.ebookFileId) {
    const ebook = await prisma.ebook.findFirst({
      where: { id: linked.ebookFileId, archivedAt: null, active: true },
    });
    if (ebook) {
      console.log(`Ebook từ Unit 1: ${ebook.title} (${ebook.id})`);
      return ebook.id;
    }
  }

  const byTitle = await prisma.ebook.findFirst({
    where: {
      archivedAt: null,
      active: true,
      OR: [
        { title: { contains: EBOOK_TITLE_HINT, mode: 'insensitive' } },
        { id: KNOWN_EBOOK.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  if (byTitle) {
    console.log(`Ebook theo title/id: ${byTitle.title} (${byTitle.id})`);
    return byTitle.id;
  }

  const created = await prisma.ebook.create({
    data: {
      id: KNOWN_EBOOK.id,
      title: KNOWN_EBOOK.title,
      originalName: KNOWN_EBOOK.originalName,
      storageKey: KNOWN_EBOOK.storageKey,
      pageCount: UNIT_COUNT,
      active: true,
    },
  });
  console.log(`Ebook tạo mới (Blob): ${created.title} (${created.id})`);
  return created.id;
}

async function main() {
  await prisma.classLevel.upsert({
    where: { levelName: LEVEL },
    update: { active: true, archivedAt: null },
    create: { levelName: LEVEL, active: true },
  });

  const ebookFileId = await resolveEbookId();

  const ebook = await prisma.ebook.findUniqueOrThrow({ where: { id: ebookFileId } });
  const pageCount =
    ebook.pageCount == null || ebook.pageCount < UNIT_COUNT ? UNIT_COUNT : ebook.pageCount;
  await prisma.ebook.update({
    where: { id: ebookFileId },
    data: { pageCount, active: true, archivedAt: null },
  });

  const results: Array<{ unit: number; action: string; courseId: string }> = [];

  for (let n = 1; n <= UNIT_COUNT; n++) {
    const name = unitName(n);
    const existing = await findLop4CourseByUnit(prisma, n);

    let courseId: string;
    let action: string;

    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          name,
          active: true,
          ebookFileId,
          ebookPageStart: n,
          ebookPageEnd: n,
          // Empty = all games; keep as-is if already filtered, else leave empty
        },
      });
      courseId = existing.id;
      action = 'updated';
    } else {
      const created = await prisma.course.create({
        data: {
          name,
          levelName: LEVEL,
          active: true,
          ebookFileId,
          ebookPageStart: n,
          ebookPageEnd: n,
        },
      });
      courseId = created.id;
      action = 'created';
    }

    for (const gameKey of GAME_KEYS) {
      await prisma.courseGameLesson.upsert({
        where: {
          courseId_gameKey: { courseId, gameKey },
        },
        update: { pageStart: n, pageEnd: n },
        create: {
          courseId,
          gameKey,
          pageStart: n,
          pageEnd: n,
        },
      });
    }

    results.push({ unit: n, action, courseId });
    console.log(`${action.padEnd(8)} ${LEVEL} ${name} → trang ${n} (scramble + grammar)`);
  }

  const created = results.filter((r) => r.action === 'created').length;
  const updated = results.filter((r) => r.action === 'updated').length;
  console.log(`\nDone: ${updated} updated, ${created} created (total ${UNIT_COUNT}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
