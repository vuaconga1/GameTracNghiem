/**
 * Seed / refresh one AI Speaking topic for every Global Success unit course
 * currently in the database (Lớp 1–9).
 *
 * Lớp 1–5: 5 pronunciation questions in the topic prompt.
 * Lớp 6–9: free-conversation topic + suggested questions.
 *
 * Extra active topics on the same course are turned off so students see one.
 *
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-speaking-all-units.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-speaking-all-units.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';
import {
  parseUnitNumberFromCourseName,
  speakingTopicForUnit,
} from '../lib/speaking/unitTopicCatalog';

const GLOBAL_LEVELS = [
  'Lớp 1',
  'Lớp 2',
  'Lớp 3',
  'Lớp 4',
  'Lớp 5',
  'Lớp 6',
  'Lớp 7',
  'Lớp 8',
  'Lớp 9',
] as const;

async function upsertCourseTopic(course: {
  id: string;
  name: string;
  levelName: string;
  enabledSkills: string[];
}) {
  const unit = parseUnitNumberFromCourseName(course.name);
  if (!unit) return { skipped: true as const, reason: 'not-a-unit', course };

  const content = speakingTopicForUnit({
    levelName: course.levelName,
    unit,
    courseName: course.name,
  });
  const instructions = buildDefaultTopicInstructions({
    topicTitle: content.topicTitle,
    levelName: course.levelName,
    practiceQuestions: content.questions,
  });

  const existing = await prisma.speakingTopic.findMany({
    where: { courseId: course.id, archivedAt: null },
    select: { id: true, title: true, active: true, sortOrder: true, createdAt: true },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const canonical =
    existing.find((row) => row.title === content.topicTitle) ?? existing[0];

  let action: 'created' | 'updated';
  let topicId: string;
  if (canonical) {
    const updated = await prisma.speakingTopic.update({
      where: { id: canonical.id },
      data: {
        title: content.topicTitle,
        instructions,
        durationSeconds: content.durationSeconds,
        active: true,
        sortOrder: 1,
      },
    });
    topicId = updated.id;
    action = 'updated';
  } else {
    const created = await prisma.speakingTopic.create({
      data: {
        courseId: course.id,
        title: content.topicTitle,
        instructions,
        durationSeconds: content.durationSeconds,
        active: true,
        sortOrder: 1,
      },
    });
    topicId = created.id;
    action = 'created';
  }

  if (existing.length > 0) {
    const extraIds = existing
      .map((row) => row.id)
      .filter((id) => id !== topicId);
    if (extraIds.length > 0) {
      await prisma.speakingTopic.updateMany({
        where: { id: { in: extraIds }, archivedAt: null },
        data: { active: false },
      });
    }
  }

  if (!course.enabledSkills.includes('speaking')) {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        enabledSkills: Array.from(new Set([...course.enabledSkills, 'speaking'])),
      },
    });
  }

  return {
    skipped: false as const,
    action,
    levelName: course.levelName,
    unit,
    courseId: course.id,
    courseName: course.name,
    topicId,
    title: content.topicTitle,
  };
}

async function main() {
  const courses = await prisma.course.findMany({
    where: {
      levelName: { in: [...GLOBAL_LEVELS] },
      active: true,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      levelName: true,
      enabledSkills: true,
    },
    orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
  });

  const results = [];
  const skipped = [];
  for (const course of courses) {
    const row = await upsertCourseTopic(course);
    if (row.skipped) {
      skipped.push({ courseId: course.id, name: course.name, reason: row.reason });
      continue;
    }
    results.push(row);
    console.log(
      `${row.action === 'created' ? '+' : '~'} ${row.levelName} Unit ${row.unit}: ${row.title}`,
    );
  }

  const byLevel: Record<string, number> = {};
  for (const row of results) {
    byLevel[row.levelName] = (byLevel[row.levelName] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        seeded: results.length,
        skipped: skipped.length,
        byLevel,
        skippedCourses: skipped,
      },
      null,
      2,
    ),
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
