/**
 * Archive all active pronunciation questions for every Lớp 8 course.
 *
 * Soft-delete only (archivedAt + active=false) — matches import/cleanup scripts.
 * Does not touch GameProgress / ScoreLog (no FK to Question; prior cleanups leave them).
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/clear-lop8-pronunciation.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { LOP8_LEVEL, parseLop8UnitNumber } from '../lib/lop8Units';

const GAME = 'pronunciation';

function preview(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  return String(p.targetText || p.word || p.prompt || p.question || '').slice(0, 70);
}

async function main() {
  const courses = await prisma.course.findMany({
    where: { levelName: LOP8_LEVEL, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  if (!courses.length) {
    console.log(`No ${LOP8_LEVEL} courses found.`);
    return;
  }

  // Prefer unit order; unknown names last.
  courses.sort((a, b) => {
    const ua = parseLop8UnitNumber(a.name);
    const ub = parseLop8UnitNumber(b.name);
    if (ua != null && ub != null) return ua - ub;
    if (ua != null) return -1;
    if (ub != null) return 1;
    return a.name.localeCompare(b.name);
  });

  let totalArchived = 0;

  for (const course of courses) {
    const unit = parseLop8UnitNumber(course.name);
    const label = unit != null ? `Unit ${unit}` : course.name;

    const rows = await prisma.question.findMany({
      where: {
        courseId: course.id,
        game: GAME,
        active: true,
        archivedAt: null,
      },
      select: { id: true, externalId: true, payload: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (rows.length) {
      await prisma.question.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { archivedAt: new Date(), active: false },
      });
    }

    totalArchived += rows.length;

    console.log(`\n=== ${course.name} (${label}) ===`);
    console.log(`  pronunciation archived: ${rows.length}`);
    if (rows.length) {
      for (const row of rows.slice(0, 8)) {
        console.log(`    ${row.externalId || '(null)'} :: ${preview(row.payload)}`);
      }
      if (rows.length > 8) console.log(`    ... +${rows.length - 8} more`);
    }
  }

  console.log(`\nDone. Courses=${courses.length} pronunciation archived=${totalArchived}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
