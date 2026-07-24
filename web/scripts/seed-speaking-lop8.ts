/**
 * Seed one AI Speaking topic per Lớp 8 course (pilot).
 * Idempotent: skips if a topic with the same title already exists on the course.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- tsx scripts/seed-speaking-lop8.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';

const TITLE = 'Unit conversation practice';
const INSTRUCTIONS = `You are a friendly English speaking coach for Vietnamese grade-8 students.
Speak English clearly and simply. Keep turns short (1–2 sentences).
Help the student practice everyday conversation related to their unit theme.
Gently correct big mistakes, then continue the chat.
Start by greeting and asking an easy warm-up question.`;

async function main() {
  const courses = await prisma.course.findMany({
    where: { levelName: 'Lớp 8', archivedAt: null, active: true },
    select: { id: true, name: true, enabledSkills: true },
    orderBy: { name: 'asc' },
  });

  let created = 0;
  let skipped = 0;

  for (const course of courses) {
    const existing = await prisma.speakingTopic.findFirst({
      where: { courseId: course.id, title: TITLE, archivedAt: null },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.speakingTopic.create({
      data: {
        courseId: course.id,
        title: TITLE,
        instructions: INSTRUCTIONS,
        durationSeconds: 300,
        active: true,
        sortOrder: 0,
      },
    });

    if (course.enabledSkills?.length && !course.enabledSkills.includes('speaking')) {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          enabledSkills: Array.from(new Set([...course.enabledSkills, 'speaking'])),
        },
      });
    }

    created += 1;
    console.log(`+ ${course.name}`);
  }

  console.log(`Done. created=${created} skipped=${skipped} courses=${courses.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
