import 'server-only';

import { unstable_cache } from 'next/cache';

import { notArchived } from '@/lib/admin/notArchived';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { fetchCourseQuestionMeta } from '@/lib/fetchCourseQuestionMeta';
import { GAME_CATALOG } from '@/lib/gameCatalog';
import { groupGrammarExercises } from '@/features/games/grammar/grammarNav';
import {
  aggregateSkillQuestionCounts,
  type SkillProgressStats,
  type SkillScopedQuestion,
} from '@/lib/gameQuestionCounts';
import { groupPronunciationExercises } from '@/lib/pronunciationExercises';
import {
  skillLessonsToMap,
  type SkillLessonMap,
} from '@/lib/courseSkillLesson';
import {
  MULTI_SKILL_GAME_KEYS,
  gamesForSkillOnCourse,
  resolveEnabledSkillIds,
  resolveGameSkillsMap,
  resolveVisibleGameKeys,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';

import type { CourseDetail, CourseGameExercises, CourseGames } from '@/lib/loadCourseDetail';

export type CourseDetailPublicShell = {
  course: CourseDetail;
  games: CourseGames;
  gameExercises?: CourseGameExercises;
  skillStats?: Partial<Record<SkillId, SkillProgressStats>>;
  skillScopedQuestions: Record<string, SkillScopedQuestion[]>;
};

async function loadCourseDetailPublic(courseId: string): Promise<CourseDetailPublicShell | null> {
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

  const skillLessons = skillLessonsToMap(course.skillLessons);
  const courseKey = progressCourseKey(course.name, course.levelName);
  const gameSkills = resolveGameSkillsMap(course.gameSkills, course.enabledGames);
  const enabledSkills = resolveEnabledSkillIds(course.enabledSkills);
  const enabledKeys = resolveVisibleGameKeys(gameSkills, enabledSkills, course.enabledGames);
  const enabledSet = new Set(enabledKeys);
  const gameKeys = GAME_CATALOG.filter((game) => enabledSet.has(game.key)).map((game) => game.key);
  const skillScopedGameKeys = gameKeys.filter((key) => MULTI_SKILL_GAME_KEYS.has(key));

  const metaGames = [
    ...(enabledSet.has('grammar') ? (['grammar'] as const) : []),
    ...(enabledSet.has('pronunciation') ? (['pronunciation'] as const) : []),
    ...skillScopedGameKeys,
  ];

  const [ebook, questionGroups, metaRows] = await Promise.all([
    course.ebookFileId
      ? prisma.ebook.findFirst({
          where: { id: course.ebookFileId, active: true, ...notArchived },
          select: { id: true, title: true, pageCount: true },
        })
      : Promise.resolve(null),
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
    metaGames.length ? fetchCourseQuestionMeta(course.id, metaGames) : Promise.resolve([]),
  ]);

  const countByGame = new Map(questionGroups.map((row) => [row.game, row._count._all] as const));
  const games: CourseGames = {};
  for (const key of gameKeys) {
    games[key] = {
      questionCount: countByGame.get(key) || 0,
      statuses: [],
    };
  }

  const grammarRows = metaRows.filter((row) => row.game === 'grammar');
  const pronunciationRows = metaRows.filter((row) => row.game === 'pronunciation');

  const gameExercises: CourseGameExercises = {};
  if (enabledSet.has('grammar') && grammarRows.length) {
    const grouped = groupGrammarExercises(
      grammarRows.map((row) => ({
        hint: row.hint,
        source: row.source,
        prefix: row.prefix,
        suffix: row.suffix,
      })),
    );
    if (grouped.length > 1) {
      gameExercises.grammar = grouped.map((group) => ({
        key: group.key,
        label: group.label,
        questionCount: group.questionCount,
        completedCount: 0,
        indices: group.indices,
      }));
    }
  }

  if (enabledSet.has('pronunciation') && pronunciationRows.length) {
    const grouped = groupPronunciationExercises(
      pronunciationRows.map((row) => ({
        exercise: row.exercise,
        exerciseKey: row.exerciseKey,
      })),
    );
    const distinct =
      grouped.length > 1 || (grouped.length === 1 && grouped[0]!.label !== 'Phát âm');
    if (distinct) {
      gameExercises.pronunciation = grouped.map((group) => ({
        key: group.key,
        label: group.label,
        questionCount: group.questionCount,
        completedCount: 0,
        indices: group.indices,
      }));
    }
  }

  const skillScopedQuestions: Record<string, SkillScopedQuestion[]> = {};
  for (const key of skillScopedGameKeys) {
    skillScopedQuestions[key] = metaRows
      .filter((row) => row.game === key)
      .map((row) => ({ skill: row.skill }));
  }

  const skillStats: Partial<Record<SkillId, SkillProgressStats>> = {};
  for (const skillId of enabledSkills) {
    const skillGames = gamesForSkillOnCourse(
      gameSkills,
      enabledSkills,
      skillId,
      course.enabledGames,
    );
    const liveKeys = skillGames.filter((game) => game.live).map((game) => game.key);
    skillStats[skillId] = aggregateSkillQuestionCounts({
      skillId,
      games: liveKeys.map((gameKey) => ({
        gameKey,
        questions: skillScopedQuestions[gameKey],
        questionCount: games[gameKey]?.questionCount,
        statuses: [],
      })),
    });
  }

  const pageStart = course.ebookPageStart && course.ebookPageStart > 0 ? course.ebookPageStart : 1;
  const pageEnd =
    course.ebookPageEnd && course.ebookPageEnd >= pageStart
      ? course.ebookPageEnd
      : ebook?.pageCount && ebook.pageCount >= pageStart
        ? ebook.pageCount
        : pageStart;

  return {
    course: {
      id: course.id,
      name: course.name,
      levelName: course.levelName,
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
    skillScopedQuestions,
  };
}

export function getCourseDetailPublicCached(courseId: string) {
  return unstable_cache(() => loadCourseDetailPublic(courseId), [`course-detail-public-${courseId}`], {
    revalidate: 300,
    tags: [`course-detail:${courseId}`],
  })();
}
