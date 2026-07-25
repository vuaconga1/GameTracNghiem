/**
 * Sample speaking topics for Lớp 4 — Unit 2 & Unit 3
 *
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-speaking-lop4-unit2-unit3-sample.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-speaking-lop4-unit2-unit3-sample.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { findLop4CourseByUnit, LOP4_LEVEL, lop4UnitCourseName } from '../lib/lop4Units';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';

const TOPICS: Array<{ unit: number; title: string; sortOrder: number }> = [
  { unit: 2, title: 'Chat about time and daily routines', sortOrder: 1 },
  { unit: 3, title: 'Chat about my week', sortOrder: 1 },
];

async function upsertTopic(input: {
  unit: number;
  title: string;
  sortOrder: number;
}) {
  const course = await findLop4CourseByUnit(prisma, input.unit);
  if (!course) {
    throw new Error(`Không tìm thấy khóa ${lop4UnitCourseName(input.unit)} (${LOP4_LEVEL})`);
  }

  const courseFull = await prisma.course.findUniqueOrThrow({
    where: { id: course.id },
    select: { id: true, name: true, enabledSkills: true, levelName: true },
  });

  const instructions = buildDefaultTopicInstructions({
    topicTitle: input.title,
    levelName: courseFull.levelName,
  });

  const existing = await prisma.speakingTopic.findFirst({
    where: { courseId: courseFull.id, title: input.title, archivedAt: null },
    select: { id: true },
  });

  let topicId: string;
  if (existing) {
    const updated = await prisma.speakingTopic.update({
      where: { id: existing.id },
      data: {
        instructions,
        durationSeconds: 300,
        active: true,
        sortOrder: input.sortOrder,
      },
    });
    topicId = updated.id;
    console.log(`Updated topic ${topicId} on ${courseFull.name}`);
  } else {
    const created = await prisma.speakingTopic.create({
      data: {
        courseId: courseFull.id,
        title: input.title,
        instructions,
        durationSeconds: 300,
        active: true,
        sortOrder: input.sortOrder,
      },
    });
    topicId = created.id;
    console.log(`Created topic ${topicId} on ${courseFull.name}`);
  }

  if (courseFull.enabledSkills?.length && !courseFull.enabledSkills.includes('speaking')) {
    await prisma.course.update({
      where: { id: courseFull.id },
      data: {
        enabledSkills: Array.from(new Set([...courseFull.enabledSkills, 'speaking'])),
      },
    });
  }

  return {
    courseId: courseFull.id,
    courseName: courseFull.name,
    levelName: courseFull.levelName,
    topicId,
    title: input.title,
    durationSeconds: 300,
    instructionsPreview: instructions.slice(0, 180) + '…',
  };
}

async function main() {
  const results = [];
  for (const topic of TOPICS) {
    results.push(await upsertTopic(topic));
  }
  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
