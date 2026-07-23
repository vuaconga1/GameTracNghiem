import 'server-only';

import { requireSession } from '@/lib/auth';
import { notArchived } from '@/lib/admin/notArchived';
import { progressCourseKey, scoreLookupCourseKeys } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { GAME_CATALOG, progressStatuses } from '@/lib/gameCatalog';
import {
  skillLessonsToMap,
  type SkillLessonMap,
} from '@/lib/courseSkillLesson';
import {
  resolveEnabledSkillIds,
  resolveGameSkillsMap,
  resolveVisibleGameKeys,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';

export type CourseDetail = {
  id: string;
  name: string;
  levelName: string;
  courseKey: string;
  /** Derived student-visible game keys (assigned + skill enabled). */
  enabledGames?: string[];
  gameSkills?: GameSkillsMap;
  enabledSkills?: SkillId[];
  ebook?: {
    id: string;
    title: string;
    pageStart: number;
    pageEnd: number;
  } | null;
  /** Per-skill PDF page ranges within the unit ebook. */
  skillLessons?: SkillLessonMap;
};

export type GameDetail = {
  questionCount: number;
  statuses: string[];
};

export type CourseGames = Record<string, GameDetail | undefined>;

export type CourseDetailData = {
  success: true;
  course: CourseDetail;
  games?: CourseGames;
  totalScore?: number;
};

export async function loadCourseDetail(courseId: string): Promise<CourseDetailData | null> {
  const session = await requireSession();
  const course = await prisma.course.findFirst({
    where: { id: courseId, active: true, archivedAt: null },
    select: {
      id: true,
      name: true,
      levelName: true,
      enabledGames: true,
      gameSkills: true,
      enabledSkills: true,
      ebookFileId: true,
      ebookPageStart: true,
      ebookPageEnd: true,
      skillLessons: {
        select: { skillId: true, pageStart: true, pageEnd: true },
      },
    },
  });

  if (!course) return null;

  let ebook: { id: string; title: string; pageCount: number | null } | null = null;
  if (course.ebookFileId) {
    ebook = await prisma.ebook.findFirst({
      where: { id: course.ebookFileId, active: true, ...notArchived },
      select: { id: true, title: true, pageCount: true },
    });
  }

  const skillLessons = skillLessonsToMap(course.skillLessons);

  const courseKey = progressCourseKey(course.name, course.levelName);
  const gameSkills = resolveGameSkillsMap(course.gameSkills, course.enabledGames);
  const enabledSkills = resolveEnabledSkillIds(course.enabledSkills);
  const enabledKeys = resolveVisibleGameKeys(gameSkills, enabledSkills, course.enabledGames);
  const enabledSet = new Set(enabledKeys);
  const catalogForCourse = GAME_CATALOG.filter((game) => enabledSet.has(game.key));
  const gameKeys = catalogForCourse.map((game) => game.key);

  const [questionGroups, progressRows, scoreAggregate] = await Promise.all([
    gameKeys.length
      ? prisma.question.groupBy({
          by: ['game'],
          where: {
            courseId: course.id,
            active: true,
            archivedAt: null,
            game: { in: gameKeys },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    gameKeys.length
      ? prisma.gameProgress.findMany({
          where: {
            userId: session.userId,
            courseKey,
            game: { in: gameKeys },
          },
          select: {
            game: true,
            statuses: true,
          },
        })
      : Promise.resolve([]),
    prisma.scoreLog.aggregate({
      where: {
        userId: session.userId,
        course: { in: scoreLookupCourseKeys(course.name, course.levelName) },
      },
      _sum: {
        points: true,
      },
    }),
  ]);

  const countByGame = new Map(questionGroups.map((row) => [row.game, row._count._all] as const));
  const progressByGame = new Map(
    progressRows.map((row) => [row.game, progressStatuses(row.statuses)] as const)
  );

  const games: Record<string, { questionCount: number; statuses: string[] }> = {};
  for (const key of gameKeys) {
    games[key] = {
      questionCount: countByGame.get(key) || 0,
      statuses: progressByGame.get(key) || [],
    };
  }

  const coursePublic = {
    id: course.id,
    name: course.name,
    levelName: course.levelName,
  };
  const { ebookPageStart, ebookPageEnd } = course;
  const pageStart = ebookPageStart && ebookPageStart > 0 ? ebookPageStart : 1;
  const pageEnd =
    ebookPageEnd && ebookPageEnd >= pageStart
      ? ebookPageEnd
      : ebook?.pageCount && ebook.pageCount >= pageStart
        ? ebook.pageCount
        : pageStart;

  return {
    success: true,
    course: {
      ...coursePublic,
      courseKey,
      enabledGames: enabledKeys,
      gameSkills,
      enabledSkills,
      ebook: ebook
        ? {
            id: ebook.id,
            title: ebook.title,
            pageStart,
            pageEnd,
          }
        : null,
      skillLessons,
    },
    games,
    totalScore: scoreAggregate._sum.points ?? 0,
  };
}
