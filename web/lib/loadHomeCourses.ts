import 'server-only';

import {
  alphabetLetterFromCourseName,
  isAlphabetLevel,
  orderHomeCourseLevels,
} from '@/lib/alphabetLevel';
import { optionalSession } from '@/lib/auth';
import { courseBackgroundSrc } from '@/lib/courseBackground';
import { progressCourseKey } from '@/lib/courseKey';
import { courseCompletionPercent } from '@/lib/courseProgress';
import { prisma } from '@/lib/db';
import { resolveSelectedHomeLevel, gradeLevelsOnly } from '@/lib/homeCourseLevel';
import {
  canAccessCourseLevel,
  filterLevelsForRole,
  normalizeUserRole,
} from '@/lib/userRoles';
import { resolveVisibleGameKeys } from '@/lib/skillCatalog';
import { sortCoursesByLevelAndName } from '@/lib/sortCourses';

export type HomeCourseListItem = {
  id: string;
  name: string;
  levelName: string;
  completionPercent: number;
  backgroundImageUrl?: string | null;
  courseKey?: string;
  enabledGames?: string[];
  questionCounts?: Record<string, number>;
  /** Alphabet level only: uppercase letter (e.g. "A") for the letter card. */
  letter?: string;
  /** Alphabet level only: a few example words shown on the letter card. */
  sampleWords?: string[];
  /** Alphabet level only: total pronunciation words behind the card. */
  wordCount?: number;
};

export type HomeCoursesFiltersData = {
  levels: string[];
};

export type HomeCoursesData = {
  courses: HomeCourseListItem[];
  filters: HomeCoursesFiltersData;
  selectedLevelName: string;
  playerKind?: 'guest' | 'authenticated';
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
  const session = await optionalSession();
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
  const role = session ? normalizeUserRole(session.role) : null;
  const roleLevels = role ? filterLevelsForRole(role, availableLevels) : availableLevels;
  const selectedLevelName = resolveSelectedHomeLevel(levelName, roleLevels);
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

  const sortedCourses = sortCoursesByLevelAndName(courses).filter((course) =>
    role ? canAccessCourseLevel(role, course.levelName) : true
  );
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
    session && courseKeys.length
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

  const sampleWordsByCourse = new Map<string, string[]>();
  if (isAlphabetLevel(selectedLevelName) && courseIds.length) {
    const wordRows = await prisma.question.findMany({
      where: {
        courseId: { in: courseIds },
        game: 'pronunciation',
        active: true,
        archivedAt: null,
      },
      select: { courseId: true, payload: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    for (const row of wordRows) {
      const list = sampleWordsByCourse.get(row.courseId) || [];
      if (list.length >= 3) continue;
      const payload = row.payload as { targetText?: unknown } | null;
      const word = String(payload?.targetText || '').trim();
      if (word) {
        list.push(word);
        sampleWordsByCourse.set(row.courseId, list);
      }
    }
  }

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

      const isAlphabet = isAlphabetLevel(course.levelName);
      return {
        id: course.id,
        name: course.name,
        levelName: course.levelName,
        backgroundImageUrl: courseBackgroundSrc(course),
        courseKey,
        enabledGames,
        questionCounts: counts,
        completionPercent: courseCompletionPercent({
          enabledGames,
          questionCounts: counts,
          progress,
        }),
        ...(isAlphabet
          ? {
              letter: alphabetLetterFromCourseName(course.name),
              sampleWords: sampleWordsByCourse.get(course.id) || [],
              wordCount: counts.pronunciation || 0,
            }
          : {}),
      };
    }),
    filters: {
      levels: orderHomeCourseLevels(gradeLevelsOnly(roleLevels)),
    },
    selectedLevelName,
    playerKind: session ? 'authenticated' : 'guest',
  };
}
