import 'server-only';

import { optionalSession } from '@/lib/auth';
import { canAccessCourseLevel, normalizeUserRole } from '@/lib/userRoles';
import { notArchived } from '@/lib/admin/notArchived';
import { progressCourseKey, scoreLookupCourseKeys } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { GAME_CATALOG, progressStatuses } from '@/lib/gameCatalog';
import { resolveCanonicalLop9CourseId } from '@/lib/lop9Units';
import {
  skillLessonsToMap,
  type SkillLessonMap,
} from '@/lib/courseSkillLesson';
import { groupGrammarExercises } from '@/features/games/grammar/grammarNav';
import {
  completedCountForIndices,
  groupPronunciationExercises,
} from '@/lib/pronunciationExercises';
import {
  aggregateSkillQuestionCounts,
  type SkillProgressStats,
  type SkillScopedQuestion,
} from '@/lib/gameQuestionCounts';
import {
  MULTI_SKILL_GAME_KEYS,
  gamesForSkillOnCourse,
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

export async function loadCourseDetail(courseId: string): Promise<CourseDetailData | null> {
  const session = await optionalSession();
  const resolvedCourseId = await resolveCanonicalLop9CourseId(prisma, courseId);
  const course = await prisma.course.findFirst({
    where: { id: resolvedCourseId, active: true, archivedAt: null },
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

  if (session && !canAccessCourseLevel(normalizeUserRole(session.role), course.levelName)) {
    return null;
  }

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
            course: { in: scoreLookupCourseKeys(course.name, course.levelName) },
            countsForCourseTotal: true,
          },
          _sum: {
            points: true,
          },
        })
      : Promise.resolve({ _sum: { points: null } }),
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

  const gameExercises: CourseGameExercises = {};
  if (enabledSet.has('grammar')) {
    const grammarRows = await prisma.question.findMany({
      where: {
        courseId: course.id,
        game: 'grammar',
        active: true,
        archivedAt: null,
      },
      select: { payload: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const grouped = groupGrammarExercises(
      grammarRows.map((row) => {
        const payload =
          typeof row.payload === 'object' && row.payload !== null && !Array.isArray(row.payload)
            ? (row.payload as Record<string, unknown>)
            : {};
        return {
          hint: typeof payload.hint === 'string' ? payload.hint : '',
          source: typeof payload.source === 'string' ? payload.source : '',
          prefix: typeof payload.prefix === 'string' ? payload.prefix : '',
          suffix: typeof payload.suffix === 'string' ? payload.suffix : '',
        };
      }),
    );
    const statuses = games.grammar?.statuses || [];
    const distinct = grouped.length > 1;
    if (distinct) {
      gameExercises.grammar = grouped.map((group) => ({
        key: group.key,
        label: group.label,
        questionCount: group.questionCount,
        completedCount: completedCountForIndices(statuses, group.indices),
        indices: group.indices,
      }));
    }
  }
  if (enabledSet.has('pronunciation')) {
    const pronunciationRows = await prisma.question.findMany({
      where: {
        courseId: course.id,
        game: 'pronunciation',
        active: true,
        archivedAt: null,
      },
      select: { payload: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const grouped = groupPronunciationExercises(
      pronunciationRows.map((row) => {
        const payload =
          typeof row.payload === 'object' && row.payload !== null && !Array.isArray(row.payload)
            ? (row.payload as Record<string, unknown>)
            : {};
        return {
          exercise: typeof payload.exercise === 'string' ? payload.exercise : '',
          exerciseKey: typeof payload.exerciseKey === 'string' ? payload.exerciseKey : '',
        };
      }),
    );
    const statuses = games.pronunciation?.statuses || [];
    const distinct =
      grouped.length > 1 || (grouped.length === 1 && grouped[0]!.label !== 'Phát âm');
    if (distinct) {
      gameExercises.pronunciation = grouped.map((group) => ({
        key: group.key,
        label: group.label,
        questionCount: group.questionCount,
        completedCount: completedCountForIndices(statuses, group.indices),
        indices: group.indices,
      }));
    }
  }

  const skillScopedGameKeys = gameKeys.filter((key) => MULTI_SKILL_GAME_KEYS.has(key));
  const skillScopedQuestions: Record<string, SkillScopedQuestion[]> = {};
  if (skillScopedGameKeys.length) {
    const rows = await prisma.question.findMany({
      where: {
        courseId: course.id,
        active: true,
        archivedAt: null,
        game: { in: skillScopedGameKeys },
      },
      select: { game: true, payload: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    for (const key of skillScopedGameKeys) {
      skillScopedQuestions[key] = [];
    }
    for (const row of rows) {
      const payload =
        typeof row.payload === 'object' && row.payload !== null && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : {};
      const skill = typeof payload.skill === 'string' ? payload.skill : '';
      skillScopedQuestions[row.game] = skillScopedQuestions[row.game] || [];
      skillScopedQuestions[row.game]!.push({ skill });
    }
  }

  const skillStats: Partial<Record<SkillId, SkillProgressStats>> = {};
  for (const skillId of enabledSkills) {
    const skillGames = gamesForSkillOnCourse(
      gameSkills,
      enabledSkills,
      skillId,
      course.enabledGames
    );
    const liveKeys = skillGames.filter((game) => game.live).map((game) => game.key);
    skillStats[skillId] = aggregateSkillQuestionCounts({
      skillId,
      games: liveKeys.map((gameKey) => ({
        gameKey,
        questions: skillScopedQuestions[gameKey],
        questionCount: games[gameKey]?.questionCount,
        statuses: games[gameKey]?.statuses,
      })),
    });
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
    gameExercises: Object.keys(gameExercises).length ? gameExercises : undefined,
    skillStats: Object.keys(skillStats).length ? skillStats : undefined,
    totalScore: scoreAggregate._sum.points ?? 0,
    playerKind: session ? 'authenticated' : 'guest',
  };
}
