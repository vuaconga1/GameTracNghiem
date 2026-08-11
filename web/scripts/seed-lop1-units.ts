/**
 * Seed Lớp 1 Unit 1–16 (Global Success 1) with Grade 1 vocab game skill map.
 * Optionally attach ebook "Global success 1" if already uploaded (Từ Vựng PDF = 16 pages).
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-lop1-units.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-lop1-units.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  ensureLop1Course,
  findLop1CourseByUnit,
  LOP1_ENABLED_GAMES,
  LOP1_ENABLED_SKILLS,
  LOP1_GAME_SKILLS,
  LOP1_LEVEL,
  LOP1_UNIT_COUNT,
  LOP1_VOCAB_GAME_KEYS,
  lop1UnitCourseName,
} from '../lib/lop1Units';

const EBOOK_TITLE_HINTS = [
  'Global success 1',
  'Global Success 1',
  'Từ Vựng',
  'Bai Tap',
  'Bài Tập',
];

async function resolveEbookId(): Promise<string | null> {
  for (const hint of EBOOK_TITLE_HINTS) {
    const ebook = await prisma.ebook.findFirst({
      where: {
        archivedAt: null,
        active: true,
        OR: [
          { title: { contains: hint, mode: 'insensitive' } },
          { originalName: { contains: hint, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (ebook) {
      console.log(`Ebook: ${ebook.title} (${ebook.id})`);
      return ebook.id;
    }
  }
  console.log('Không tìm thấy ebook Global Success 1 — tạo unit không gắn PDF.');
  return null;
}

async function main() {
  await prisma.classLevel.upsert({
    where: { levelName: LOP1_LEVEL },
    update: { active: true, archivedAt: null },
    create: { levelName: LOP1_LEVEL, active: true },
  });

  const ebookFileId = await resolveEbookId();
  if (ebookFileId) {
    await prisma.ebook.update({
      where: { id: ebookFileId },
      data: {
        pageCount: Math.max(LOP1_UNIT_COUNT, 16),
        active: true,
        archivedAt: null,
      },
    });
  }

  const results: Array<{ unit: number; action: string; courseId: string }> = [];

  for (let n = 1; n <= LOP1_UNIT_COUNT; n++) {
    const before = await findLop1CourseByUnit(prisma, n);
    const action = before ? 'updated' : 'created';

    const course = await ensureLop1Course(prisma, n);

    await prisma.course.update({
      where: { id: course.id },
      data: {
        ebookFileId: ebookFileId ?? undefined,
        ebookPageStart: ebookFileId ? n : undefined,
        ebookPageEnd: ebookFileId ? n : undefined,
        enabledSkills: LOP1_ENABLED_SKILLS,
        enabledGames: LOP1_ENABLED_GAMES,
        gameSkills: LOP1_GAME_SKILLS,
      },
    });

    if (ebookFileId) {
      await prisma.courseSkillLesson.upsert({
        where: { courseId_skillId: { courseId: course.id, skillId: 'vocabulary' } },
        update: { pageStart: n, pageEnd: n },
        create: {
          courseId: course.id,
          skillId: 'vocabulary',
          pageStart: n,
          pageEnd: n,
        },
      });
      for (const gameKey of LOP1_VOCAB_GAME_KEYS) {
        await prisma.courseGameLesson.upsert({
          where: { courseId_gameKey: { courseId: course.id, gameKey } },
          update: { pageStart: n, pageEnd: n },
          create: {
            courseId: course.id,
            gameKey,
            pageStart: n,
            pageEnd: n,
          },
        });
      }
    }

    results.push({ unit: n, action, courseId: course.id });
    console.log(
      `${action.padEnd(8)} ${LOP1_LEVEL} ${lop1UnitCourseName(n)}${
        ebookFileId ? ` → trang ${n}` : ''
      }`,
    );
  }

  const created = results.filter((r) => r.action === 'created').length;
  const updated = results.filter((r) => r.action === 'updated').length;
  console.log(
    `\nDone: ${updated} updated, ${created} created (total ${LOP1_UNIT_COUNT}).`,
  );
  console.log(`Games: ${LOP1_ENABLED_GAMES.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
