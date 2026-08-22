import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

export type CourseQuestionMetaRow = {
  game: string;
  hint: string;
  source: string;
  prefix: string;
  suffix: string;
  exercise: string;
  exerciseKey: string;
  skill: string;
};

function asString(value: unknown): string {
  return String(value ?? '').trim();
}

/** Load only grouping fields from question payloads (not full JSON blobs). */
export async function fetchCourseQuestionMeta(
  courseId: string,
  games: string[],
): Promise<CourseQuestionMetaRow[]> {
  const uniqueGames = [...new Set(games.filter(Boolean))];
  if (!uniqueGames.length) return [];

  const rows = await prisma.$queryRaw<
    Array<{
      game: string;
      hint: string | null;
      source: string | null;
      prefix: string | null;
      suffix: string | null;
      exercise: string | null;
      exerciseKey: string | null;
      skill: string | null;
    }>
  >(Prisma.sql`
    SELECT
      game,
      payload->>'hint' AS hint,
      payload->>'source' AS source,
      payload->>'prefix' AS prefix,
      payload->>'suffix' AS suffix,
      payload->>'exercise' AS exercise,
      payload->>'exerciseKey' AS "exerciseKey",
      payload->>'skill' AS skill
    FROM "Question"
    WHERE "courseId" = ${courseId}
      AND active = true
      AND "archivedAt" IS NULL
      AND game IN (${Prisma.join(uniqueGames)})
    ORDER BY "sortOrder" ASC, id ASC
  `);

  return rows.map((row) => ({
    game: row.game,
    hint: asString(row.hint),
    source: asString(row.source),
    prefix: asString(row.prefix),
    suffix: asString(row.suffix),
    exercise: asString(row.exercise),
    exerciseKey: asString(row.exerciseKey),
    skill: asString(row.skill),
  }));
}
