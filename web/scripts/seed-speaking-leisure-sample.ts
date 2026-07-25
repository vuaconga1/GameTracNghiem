/**
 * Sample speaking topic for Lớp 8 — UNIT 1: LEISURE
 *
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-speaking-leisure-sample.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-speaking-leisure-sample.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';

const TITLE = 'Chat about leisure time';

async function main() {
  const course = await prisma.course.findFirst({
    where: {
      levelName: 'Lớp 8',
      name: { contains: 'LEISURE' },
      archivedAt: null,
      active: true,
    },
    select: { id: true, name: true, enabledSkills: true, levelName: true },
  });

  if (!course) {
    throw new Error('Không tìm thấy khóa UNIT 1: LEISURE (Lớp 8)');
  }

  const instructions = buildDefaultTopicInstructions({
    topicTitle: TITLE,
    levelName: course.levelName,
  });

  const existing = await prisma.speakingTopic.findFirst({
    where: { courseId: course.id, title: TITLE, archivedAt: null },
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
        sortOrder: 1,
      },
    });
    topicId = updated.id;
    console.log(`Updated topic ${topicId} on ${course.name}`);
  } else {
    const created = await prisma.speakingTopic.create({
      data: {
        courseId: course.id,
        title: TITLE,
        instructions,
        durationSeconds: 300,
        active: true,
        sortOrder: 1,
      },
    });
    topicId = created.id;
    console.log(`Created topic ${topicId} on ${course.name}`);
  }

  if (course.enabledSkills?.length && !course.enabledSkills.includes('speaking')) {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        enabledSkills: Array.from(new Set([...course.enabledSkills, 'speaking'])),
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        courseId: course.id,
        courseName: course.name,
        topicId,
        title: TITLE,
        durationSeconds: 300,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
