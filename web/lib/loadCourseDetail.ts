import 'server-only';

import { optionalSession } from '@/lib/auth';
import { canAccessCourseLevel, normalizeUserRole } from '@/lib/userRoles';
import { progressCourseKey, scoreLookupCourseKeys } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { progressStatuses } from '@/lib/gameCatalog';
import { resolveCanonicalLop9CourseId } from '@/lib/lop9Units';
import type { SkillLessonMap } from '@/lib/courseSkillLesson';
import {
  aggregateSkillQuestionCounts,
  type SkillProgressStats,
} from '@/lib/gameQuestionCounts';
import {
  gamesForSkillOnCourse,
  resolveEnabledSkillIds,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';
import { completedCountForIndices } from '@/lib/pronunciationExercises';
import { getCourseDetailPublicCached } from '@/lib/loadCourseDetailPublic';
import type { CourseDetailPublicShell } from '@/lib/loadCourseDetailPublic';

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

/** Pronunciation (and similar) worksheet groups shown as separate skill cards. */
export type GameExerciseCard = {
  key: string;
  label: string;
  questionCount: number;
  completedCount: number;
  /** Absolute indices into the game's statuses / question list. */
  indices: number[];
};

export type CourseGameExercises = Partial<Record<string, GameExerciseCard[]>>;

export type CourseDetailData = {
  success: true;
  course: CourseDetail;
  games?: CourseGames;
  /** Present when a game is split into exercise/phoneme cards (e.g. pronunciation). */
  gameExercises?: CourseGameExercises;
  /** Per-skill totals (skill-scoped games filtered by payload.skill). */
  skillStats?: Partial<Record<SkillId, SkillProgressStats>>;
  totalScore?: number;
  playerKind?: 'guest' | 'authenticated';
};

function mergeUserProgress(
  shell: CourseDetailPublicShell,
  progressByGame: Map<string, string[]>,
): Pick<CourseDetailData, 'games' | 'gameExercises' | 'skillStats'> {
  const games: CourseGames = {};
  for (const [gameKey, detail] of Object.entries(shell.games)) {
    if (!detail) continue;
    games[gameKey] = {
      questionCount: detail.questionCount,
      statuses: progressByGame.get(gameKey) || [],
    };
  }

  let gameExercises = shell.gameExercises;
  if (gameExercises) {
    gameExercises = Object.fromEntries(
      Object.entries(gameExercises).map(([gameKey, groups]) => [
        gameKey,
        groups?.map((group) => ({
          ...group,
          completedCount: completedCountForIndices(
            progressByGame.get(gameKey) || [],
            group.indices,
          ),
        })),
      ]),
    ) as CourseGameExercises;
  }

  const enabledSkills = resolveEnabledSkillIds(shell.course.enabledSkills);
  const skillStats: Partial<Record<SkillId, SkillProgressStats>> = {};

  if (shell.skillStats) {
    for (const skillId of enabledSkills) {
      const skillGames = gamesForSkillOnCourse(
        shell.course.gameSkills ?? {},
        enabledSkills,
        skillId,
      );
      const liveKeys = skillGames.filter((game) => game.live).map((game) => game.key);
      skillStats[skillId] = aggregateSkillQuestionCounts({
        skillId,
        games: liveKeys.map((gameKey) => ({
          gameKey,
          questions: shell.skillScopedQuestions[gameKey],
          questionCount: games[gameKey]?.questionCount,
          statuses: games[gameKey]?.statuses,
        })),
      });
    }
  }

  return {
    games,
    gameExercises,
    skillStats: Object.keys(skillStats).length ? skillStats : shell.skillStats,
  };
}

export async function loadCourseDetail(courseId: string): Promise<CourseDetailData | null> {
  const session = await optionalSession();
  const resolvedCourseId = await resolveCanonicalLop9CourseId(prisma, courseId);
  const shell = await getCourseDetailPublicCached(resolvedCourseId);

  if (!shell) return null;

  if (session && !canAccessCourseLevel(normalizeUserRole(session.role), shell.course.levelName)) {
    return null;
  }

  const gameKeys = Object.keys(shell.games);
  const courseKey = progressCourseKey(shell.course.name, shell.course.levelName);

  const [progressRows, scoreAggregate] = await Promise.all([
    session && gameKeys.length
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
    session
      ? prisma.scoreLog.aggregate({
          where: {
            userId: session.userId,
            course: { in: scoreLookupCourseKeys(shell.course.name, shell.course.levelName) },
            countsForCourseTotal: true,
          },
          _sum: {
            points: true,
          },
        })
      : Promise.resolve({ _sum: { points: null } }),
  ]);

  const progressByGame = new Map(
    progressRows.map((row) => [row.game, progressStatuses(row.statuses)] as const),
  );
  const merged = mergeUserProgress(shell, progressByGame);

  return {
    success: true,
    course: shell.course,
    games: merged.games,
    gameExercises: merged.gameExercises,
    skillStats: merged.skillStats,
    totalScore: scoreAggregate._sum.points ?? 0,
    playerKind: session ? 'authenticated' : 'guest',
  };
}
