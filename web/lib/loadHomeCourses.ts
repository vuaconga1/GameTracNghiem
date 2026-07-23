import 'server-only';

import { requireSession } from '@/lib/auth';
import { courseBackgroundSrc } from '@/lib/courseBackground';
import { progressCourseKey } from '@/lib/courseKey';
import { courseCompletionPercent } from '@/lib/courseProgress';
import { prisma } from '@/lib/db';
import { resolveHomeCoursesLevel } from '@/lib/homeCourseLevel';
import { resolveVisibleGameKeys } from '@/lib/skillCatalog';
import { sortCoursesByLevelAndName } from '@/lib/sortCourses';

export type HomeCourseListItem = {
  id: string;
  name: string;
  levelName: string;
  completionPercent: number;
  backgroundImageUrl?: string | null;
};

export type HomeCoursesFiltersData = {
  levels: string[];
};

export type HomeCoursesData = {
  courses: HomeCourseListItem[];
  filters: HomeCoursesFiltersData;
  selectedLevelName: string;
};

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => String(value || '').trim())
        .filter((value) => value && value !== 'Tất cả')
    ),
  ].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' }));
}

export async function loadHomeCourses(levelName = ''): Promise<HomeCoursesData> {
  const session = await requireSession();
  const [classLevels, activeCoursesForFilters] = await Promise.all([
    prisma.classLevel.findMany({
      where: { active: true, archivedAt: null },
      select: { levelName: true },
      orderBy: [{ levelName: 'asc' }],
    }),
    prisma.course.findMany({
      where: { active: true, archivedAt: null },
      select: { levelName: true },
    }),
  ]);
  const availableLevels = uniqueSorted([
    ...classLevels.map((item) => item.levelName),
    ...activeCoursesForFilters.map((item) => item.levelName),
  ]);
  const selectedLevelName = resolveHomeCoursesLevel(levelName, availableLevels);
  const courses = await prisma.course.findMany({
    where: {
      active: true,
      archivedAt: null,
      ...(selectedLevelName ? { levelName: selectedLevelName } : {}),
    },
    select: {
      id: true,
      name: true,
      levelName: true,
      enabledGames: true,
      gameSkills: true,
      enabledSkills: true,
      backgroundImageUrl: true,
      backgroundImageKey: true,
    },
    orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
  });

  const sortedCourses = sortCoursesByLevelAndName(courses);
  const courseIds = sortedCourses.map((course) => course.id);
  const courseKeys = sortedCourses.map((course) => progressCourseKey(course.name, course.levelName));
  const [questionGroups, progressRows] = await Promise.all([
    courseIds.length
      ? prisma.question.groupBy({
          by: ['courseId', 'game'],
          where: {
            courseId: { in: courseIds },
            active: true,
            archivedAt: null,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    courseKeys.length
      ? prisma.gameProgress.findMany({
          where: {
            userId: session.userId,
            courseKey: { in: courseKeys },
          },
          select: {
            courseKey: true,
            game: true,
            statuses: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const questionCounts = new Map(
    questionGroups.map((row) => [`${row.courseId}:${row.game}`, row._count._all] as const)
  );
  const progressByCourseGame = new Map(
    progressRows.map((row) => [`${row.courseKey}:${row.game}`, row.statuses] as const)
  );

  return {
    courses: sortedCourses.map((course) => {
      const courseKey = progressCourseKey(course.name, course.levelName);
      const enabledGames = resolveVisibleGameKeys(
        course.gameSkills,
        course.enabledSkills,
        course.enabledGames
      );
      const counts = Object.fromEntries(
        enabledGames.map((game) => [game, questionCounts.get(`${course.id}:${game}`) || 0])
      );
      const progress = Object.fromEntries(
        enabledGames.map((game) => [game, progressByCourseGame.get(`${courseKey}:${game}`) || []])
      );

      return {
        id: course.id,
        name: course.name,
        levelName: course.levelName,
        backgroundImageUrl: courseBackgroundSrc(course),
        completionPercent: courseCompletionPercent({
          enabledGames,
          questionCounts: counts,
          progress,
        }),
      };
    }),
    filters: {
      levels: availableLevels,
    },
    selectedLevelName,
  };
}
