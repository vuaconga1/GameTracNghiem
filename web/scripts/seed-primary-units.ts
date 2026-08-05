/**
 * Seed Lớp 2 / 3 / 5 unit courses (Global Success) with primary vocab game skills.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-primary-units.ts --grade=all
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-primary-units.ts --grade=2,3,5
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  ensurePrimaryCourse,
  findCourseByUnit,
  PRIMARY_ENABLED_GAMES,
  PRIMARY_ENABLED_SKILLS,
  PRIMARY_GAME_SKILLS,
  PRIMARY_VOCAB_GAME_KEYS,
} from '../lib/primaryGradeConfig';
import {
  parsePrimaryGradeArg,
  PRIMARY_GRADE_SPECS,
  type PrimaryGradeId,
} from '../lib/primaryGradeSpecs';

async function resolveEbookId(hints: string[]): Promise<string | null> {
  for (const hint of hints) {
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
  return null;
}

async function seedGrade(grade: PrimaryGradeId) {
  const spec = PRIMARY_GRADE_SPECS[grade];
  await prisma.classLevel.upsert({
    where: { levelName: spec.levelName },
    update: { active: true, archivedAt: null },
    create: { levelName: spec.levelName, active: true },
  });

  const ebookFileId = await resolveEbookId(spec.ebookHints);
  if (!ebookFileId) {
    console.log(`${spec.levelName}: chưa có ebook — tạo unit không gắn PDF.`);
  } else {
    await prisma.ebook.update({
      where: { id: ebookFileId },
      data: {
        pageCount: Math.max(spec.unitCount, 16),
        active: true,
        archivedAt: null,
      },
    });
  }

  let created = 0;
  let updated = 0;

  for (let n = 1; n <= spec.unitCount; n++) {
    const title = spec.titles[n];
    if (!title) throw new Error(`Missing title for ${spec.levelName} unit ${n}`);
    const before = await findCourseByUnit(prisma, spec.levelName, n);
    const course = await ensurePrimaryCourse(prisma, {
      levelName: spec.levelName,
      unit: n,
      title,
    });
    if (before) updated += 1;
    else created += 1;

    await prisma.course.update({
      where: { id: course.id },
      data: {
        ebookFileId: ebookFileId ?? undefined,
        ebookPageStart: ebookFileId ? n : undefined,
        ebookPageEnd: ebookFileId ? n : undefined,
        enabledSkills: PRIMARY_ENABLED_SKILLS,
        enabledGames: PRIMARY_ENABLED_GAMES,
        gameSkills: PRIMARY_GAME_SKILLS,
      },
    });

    if (ebookFileId) {
      for (const gameKey of PRIMARY_VOCAB_GAME_KEYS) {
        await prisma.courseGameLesson.upsert({
          where: { courseId_gameKey: { courseId: course.id, gameKey } },
          update: { pageStart: n, pageEnd: n },
          create: { courseId: course.id, gameKey, pageStart: n, pageEnd: n },
        });
      }
    }

    console.log(
      `${(before ? 'updated' : 'created').padEnd(8)} ${spec.levelName} ${course.name}${
        ebookFileId ? ` → trang ${n}` : ''
      }`,
    );
  }

  console.log(
    `\n${spec.levelName} done: ${updated} updated, ${created} created (total ${spec.unitCount}).`,
  );
}

async function main() {
  const grades = parsePrimaryGradeArg(process.argv.slice(2));
  for (const grade of grades) {
    await seedGrade(grade);
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
