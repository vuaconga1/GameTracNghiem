/**
 * Seed / refresh AI Speaking topics for every Lớp 8 unit course.
 * Topic title follows the unit theme (e.g. Leisure Time → "Chat about leisure time").
 * Instructions always come from buildDefaultTopicInstructions (grade-aware prompt).
 *
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-speaking-lop8.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/seed-speaking-lop8.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import {
  findLop8CourseByUnit,
  LOP8_LEVEL,
  LOP8_UNIT_COUNT,
  LOP8_UNIT_TITLES,
  lop8UnitCourseName,
} from '../lib/lop8Units';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';

/** Legacy generic title from an earlier seed — deactivate so it does not clutter UI. */
const LEGACY_GENERIC_TITLE = 'Unit conversation practice';

function speakingTopicTitleFromUnit(unitTitle: string): string {
  return `Chat about ${unitTitle.trim().toLowerCase()}`;
}

async function upsertUnitTopic(unit: number) {
  const unitTitle = LOP8_UNIT_TITLES[unit];
  if (!unitTitle) {
    throw new Error(`Unknown Lớp 8 unit: ${unit}`);
  }

  const courseRow = await findLop8CourseByUnit(prisma, unit);
  if (!courseRow) {
    throw new Error(`Không tìm thấy khóa ${lop8UnitCourseName(unit)} (${LOP8_LEVEL})`);
  }

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseRow.id },
    select: { id: true, name: true, enabledSkills: true, levelName: true },
  });

  const title = speakingTopicTitleFromUnit(unitTitle);
  const instructions = buildDefaultTopicInstructions({
    topicTitle: title,
    levelName: course.levelName,
  });

  const existing = await prisma.speakingTopic.findFirst({
    where: { courseId: course.id, title, archivedAt: null },
    select: { id: true },
  });

  let action: 'created' | 'updated';
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
    action = 'updated';
  } else {
    const created = await prisma.speakingTopic.create({
      data: {
        courseId: course.id,
        title,
        instructions,
        durationSeconds: 300,
        active: true,
        sortOrder: 1,
      },
    });
    topicId = created.id;
    action = 'created';
  }

  // Hide older generic topic on the same course (if any).
  await prisma.speakingTopic.updateMany({
    where: {
      courseId: course.id,
      title: LEGACY_GENERIC_TITLE,
      archivedAt: null,
      active: true,
    },
    data: { active: false },
  });

  if (course.enabledSkills?.length && !course.enabledSkills.includes('speaking')) {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        enabledSkills: Array.from(new Set([...course.enabledSkills, 'speaking'])),
      },
    });
  }

  return {
    action,
    unit,
    courseId: course.id,
    courseName: course.name,
    topicId,
    title,
    cefrHint: 'A1–A2 (grades 6–9)',
  };
}

async function main() {
  const results = [];
  for (let unit = 1; unit <= LOP8_UNIT_COUNT; unit += 1) {
    const row = await upsertUnitTopic(unit);
    results.push(row);
    console.log(`${row.action === 'created' ? '+' : '~'} Unit ${unit}: ${row.title}`);
  }
  console.log(JSON.stringify({ level: LOP8_LEVEL, count: results.length, results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
