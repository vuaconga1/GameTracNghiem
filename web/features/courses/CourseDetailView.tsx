'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useHomeHref } from '@/components/shell/HomeNavContext';
import { PageBackButton } from '@/components/PageBackButton';
import { usePlayer } from '@/components/player/PlayerContext';
import { CourseVocabTab } from '@/features/courses/CourseVocabTab';
import { EbookViewer } from '@/features/courses/EbookViewer';
import { localizeExerciseTitle } from '@/features/games/localizeExerciseTitle';
import {
  resolveCourseEbookPagesForSkill,
} from '@/lib/courseSkillLesson';
import { GAME_CATALOG, type ProgressStatus } from '@/lib/gameCatalog';
import type {
  CourseDetail,
  CourseDetailData,
  CourseGames,
  GameDetail,
} from '@/lib/loadCourseDetail';
import { resolveCourseVocabDeck } from '@/lib/courseVocabDeck';
import { isLogisticsLevel, logisticsWeekHomeHref } from '@/lib/logisticsUnits';
import {
  guestCourseScore,
  readGuestGameState,
} from '@/lib/player/guestPlayerAdapter';
import {
  gamesForSkillOnCourse,
  parseSkillQuery,
  resolveEnabledSkillIds,
  resolveGameSkillsMap,
  resolveVisibleGameKeys,
  visibleSkillsForCourse,
  type SkillId,
} from '@/lib/skillCatalog';

type CourseDetailResponse = {
  success: boolean;
  course?: CourseDetail;
  games?: CourseGames;
  gameExercises?: CourseDetailData['gameExercises'];
  skillStats?: CourseDetailData['skillStats'];
  totalScore?: number;
  playerKind?: 'guest' | 'authenticated';
  message?: string;
};

type CourseDetailContentProps = {
  data: CourseDetailData;
  initialTab?: DetailTab;
  initialSkill?: SkillId | null;
};

type CourseDetailViewProps = {
  courseId: string;
  initialData?: CourseDetailData | null;
  initialSkill?: SkillId | null;
};

type DetailTab = 'lesson' | 'exercises' | 'vocab';

function completedStatusCount(statuses: string[] | undefined) {
  return (statuses || []).filter((status) => status !== 'empty').length;
}

function activityProgress(
  detail: GameDetail | undefined,
  live: boolean,
  skillSlice: { questionCount: number; completedCount: number } | null | undefined,
  comingSoonLabel: string
) {
  if (!live) return comingSoonLabel;
  if (skillSlice) {
    if (skillSlice.questionCount <= 0) return '—';
    return `${skillSlice.completedCount}/${skillSlice.questionCount}`;
  }
  if (!detail) return '—';
  return `${completedStatusCount(detail.statuses)}/${detail.questionCount}`;
}

function aggregateActivityStats(games: CourseGames | undefined, gameKeys: string[]) {
  let totalQuestions = 0;
  let completedQuestions = 0;

  for (const key of gameKeys) {
    const detail = games?.[key];
    if (!detail) continue;
    totalQuestions += detail.questionCount;
    completedQuestions += completedStatusCount(detail.statuses);
  }

  return { totalQuestions, completedQuestions };
}

function formatCourseScore(points: number, locale: string) {
  return Number(points).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function hydrateGuestCourseDetail(data: CourseDetailData): CourseDetailData {
  const games = Object.fromEntries(
    Object.entries(data.games || {}).map(([game, detail]) => {
      if (!detail) return [game, detail];
      const local = readGuestGameState(data.course.courseKey, game);
      return [game, { ...detail, statuses: local.statuses }];
    }),
  );
  const gameExercises = data.gameExercises
    ? Object.fromEntries(
        Object.entries(data.gameExercises).map(([game, groups]) => [
          game,
          groups?.map((group) => ({
            ...group,
            completedCount: group.indices.filter(
              (index) => games[game]?.statuses[index] !== 'empty',
            ).length,
          })),
        ]),
      )
    : undefined;
  const skillStats = data.skillStats
    ? Object.fromEntries(
        Object.entries(data.skillStats).map(([skill, stats]) => {
          const byGame = Object.fromEntries(
            Object.entries(stats?.byGame || {}).map(([game, slice]) => [
              game,
              {
                ...slice,
                completedCount: Math.min(
                  slice.questionCount,
                  completedStatusCount(games[game]?.statuses),
                ),
              },
            ]),
          );
          return [
            skill,
            stats
              ? {
                  ...stats,
                  byGame,
                  completedQuestions: Object.values(byGame).reduce(
                    (total, slice) => total + slice.completedCount,
                    0,
                  ),
                }
              : stats,
          ];
        }),
      )
    : undefined;
  const gameKeys = Object.keys(games);
  return {
    ...data,
    games,
    gameExercises,
    skillStats,
    totalScore: guestCourseScore(data.course.courseKey, gameKeys),
  };
}

export function CourseDetailContent({
  data,
  initialTab = 'exercises',
  initialSkill = null,
}: CourseDetailContentProps) {
  const { t, formatClassLevel, locale } = useI18n();
  const homeHref = useHomeHref();
  const searchParams = useSearchParams();
  const skillFromUrl = parseSkillQuery(searchParams.get('skill')) ?? initialSkill;
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  const gameSkills = resolveGameSkillsMap(data.course.gameSkills, data.course.enabledGames);
  const enabledSkills = resolveEnabledSkillIds(data.course.enabledSkills);
  const visibleGameKeys = resolveVisibleGameKeys(
    gameSkills,
    enabledSkills,
    data.course.enabledGames
  );
  const skillCards = visibleSkillsForCourse(enabledSkills);
  const selectedSkill =
    skillFromUrl && enabledSkills.includes(skillFromUrl) ? skillFromUrl : null;
  const activities = selectedSkill
    ? gamesForSkillOnCourse(gameSkills, enabledSkills, selectedSkill, data.course.enabledGames)
    : GAME_CATALOG.filter((activity) => visibleGameKeys.includes(activity.key));
  const liveActivityKeys = visibleGameKeys.filter((key) =>
    GAME_CATALOG.some((game) => game.key === key && game.live)
  );
  const { totalQuestions, completedQuestions } = aggregateActivityStats(
    data.games,
    liveActivityKeys
  );
  const totalScore = data.totalScore ?? 0;
  const vocabDeck = resolveCourseVocabDeck({
    id: data.course.id,
    name: data.course.name,
    levelName: data.course.levelName,
  });
  const showSkillTabs = Boolean(selectedSkill);
  const showVocabTab = showSkillTabs && Boolean(vocabDeck?.length);
  const effectiveTab: DetailTab = !showSkillTabs
    ? 'exercises'
    : activeTab === 'vocab' && !showVocabTab
      ? 'exercises'
      : activeTab;
  const showBookCard = effectiveTab === 'exercises';
  const showSkillCards = effectiveTab === 'exercises' && !selectedSkill;
  const showGameGrid = effectiveTab === 'exercises' && Boolean(selectedSkill);
  const selectedSkillMeta = skillCards.find((skill) => skill.id === selectedSkill);
  const logisticsHomeHref = isLogisticsLevel(data.course.levelName)
    ? logisticsWeekHomeHref(data.course.id)
    : homeHref;
  const backHref = selectedSkill ? `/courses/${data.course.id}` : logisticsHomeHref;
  const unitEbook = data.course.ebook
    ? { pageStart: data.course.ebook.pageStart, pageEnd: data.course.ebook.pageEnd }
    : null;
  const lessonPages = resolveCourseEbookPagesForSkill({
    skillId: selectedSkill,
    unitEbook,
    skillLessons: data.course.skillLessons,
  });
  const showLessonViewer = showSkillTabs && effectiveTab === 'lesson';
  const showVocabViewer = showVocabTab && effectiveTab === 'vocab';
  const comingSoonLabel = t('course.comingSoon');

  return (
    <section id="view-detail" className="view-detail">
      <PageBackButton href={backHref} />

      <div
        className={
          effectiveTab === 'lesson' || effectiveTab === 'vocab'
            ? 'detail-body detail-body--lesson-full'
            : 'detail-body'
        }
      >
        {showBookCard ? (
          <div className="book-card">
            <div className="book-card-top">
              <div className="book-thumb">
                <i className="fas fa-book" aria-hidden="true" />
              </div>
              <div className="book-info">
                <h2>{data.course.name}</h2>
                <p>{formatClassLevel(data.course.levelName)}</p>
              </div>
            </div>
            {totalQuestions > 0 ? (
              <div className="book-stats">
                <div className="book-stat">
                  <div className="book-stat-value">
                    {completedQuestions}/{totalQuestions}
                  </div>
                  <div className="book-stat-label">{t('course.statQuestionsDone')}</div>
                </div>
                <div className="book-stat">
                  <div className="book-stat-value">{formatCourseScore(totalScore, locale)}</div>
                  <div className="book-stat-label">{t('course.statTotalScore')}</div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="detail-main-panel">
          {showSkillTabs ? (
            <div className="detail-tabs tabs-secondary">
              <button
                type="button"
                className={effectiveTab === 'exercises' ? 'tab-secondary active' : 'tab-secondary'}
                data-detail-tab="exercises"
                onClick={() => setActiveTab('exercises')}
              >
                <i className="fas fa-gamepad" aria-hidden="true" /> {t('course.tabExercises')}
              </button>
              <button
                type="button"
                className={effectiveTab === 'lesson' ? 'tab-secondary active' : 'tab-secondary'}
                data-detail-tab="lesson"
                onClick={() => setActiveTab('lesson')}
              >
                <i className="fas fa-book-open" aria-hidden="true" /> {t('course.tabLessons')}
              </button>
              {showVocabTab ? (
                <button
                  type="button"
                  className={effectiveTab === 'vocab' ? 'tab-secondary active' : 'tab-secondary'}
                  data-detail-tab="vocab"
                  onClick={() => setActiveTab('vocab')}
                >
                  <i className="fas fa-spell-check" aria-hidden="true" /> {t('course.tabVocab')}
                </button>
              ) : null}
            </div>
          ) : null}

          {showLessonViewer ? (
            <div className="detail-panel">
              {lessonPages.kind === 'unit' || lessonPages.kind === 'skill' ? (
                <EbookViewer
                  ebookId={data.course.ebook!.id}
                  pageStart={lessonPages.pageStart}
                  pageEnd={lessonPages.pageEnd}
                />
              ) : (
                <div className="ebook-viewer">
                  <div className="ebook-empty">
                    {lessonPages.kind === 'missing-skill-lesson'
                      ? t('course.missingSkillLesson')
                      : t('course.missingUnitEbook')}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {showVocabViewer && vocabDeck ? (
            <div className="detail-panel">
              <CourseVocabTab cards={vocabDeck} />
            </div>
          ) : null}

          <div className={effectiveTab === 'exercises' ? 'detail-panel' : 'detail-panel is-hidden'}>
            <div className="activity-area">
              {showSkillCards ? (
                <div className="activity-grid skill-grid" data-skill-step="skills">
                  {(() => {
                    const visibleSkillCards = skillCards.filter((skill) => {
                      const skillGames = gamesForSkillOnCourse(
                        gameSkills,
                        enabledSkills,
                        skill.id,
                        data.course.enabledGames
                      );
                      const liveKeys = skillGames
                        .filter((game) => game.live)
                        .map((game) => game.key);
                      const stats =
                        data.skillStats?.[skill.id] ??
                        aggregateActivityStats(data.games, liveKeys);
                      // Speaking stays visible: AI Speaking hub is available without question rows.
                      if (skill.id === 'speaking') return true;
                      return stats.totalQuestions > 0;
                    });

                    if (visibleSkillCards.length === 0) {
                      return <div className="ebook-empty">{t('course.noSkills')}</div>;
                    }

                    return visibleSkillCards.map((skill) => {
                      const skillGames = gamesForSkillOnCourse(
                        gameSkills,
                        enabledSkills,
                        skill.id,
                        data.course.enabledGames
                      );
                      const liveKeys = skillGames
                        .filter((game) => game.live)
                        .map((game) => game.key);
                      const stats =
                        data.skillStats?.[skill.id] ??
                        aggregateActivityStats(data.games, liveKeys);
                      const progress =
                        stats.totalQuestions > 0
                          ? `${stats.completedQuestions}/${stats.totalQuestions}`
                          : skill.id === 'speaking'
                            ? t('course.practiceSpeaking')
                            : t('course.noExercisesYet');
                      return (
                        <Link
                          key={skill.id}
                          href={`/courses/${data.course.id}?skill=${skill.id}`}
                          className="activity-card skill-card"
                          data-skill={skill.id}
                        >
                          <div className="activity-left">
                            <div className={`activity-icon ${skill.iconClass}`}>
                              <i className={skill.icon} aria-hidden="true" />
                            </div>
                            <span className="activity-label">{t(`skills.${skill.id}`)}</span>
                          </div>
                          <span className="activity-progress">{progress}</span>
                        </Link>
                      );
                    });
                  })()}
                </div>
              ) : null}

              {showGameGrid ? (
                <div
                  className="activity-grid"
                  data-skill-step="games"
                  data-skill={selectedSkill || ''}
                >
                  {selectedSkillMeta ? (
                    <div className="skill-games-heading" style={{ gridColumn: '1 / -1' }}>
                      {t(`skills.${selectedSkillMeta.id}`)}
                    </div>
                  ) : null}
                  {selectedSkill === 'speaking' ? (
                    <Link
                      href={`/speaking/${data.course.id}`}
                      className="activity-card"
                      data-activity="ai-speaking"
                    >
                      <div className="activity-left">
                        <div className="activity-icon skill-speaking">
                          <i className="fas fa-comments" aria-hidden="true" />
                        </div>
                        <span className="activity-label">{t('course.speakingDaily')}</span>
                      </div>
                      <span className="activity-progress">{t('course.practiceSpeaking')}</span>
                    </Link>
                  ) : null}
                  {(() => {
                    const gameCards = activities.flatMap((activity) => {
                      const detail = data.games?.[activity.key];
                      const skillSlice =
                        selectedSkill && data.skillStats?.[selectedSkill]?.byGame?.[activity.key]
                          ? data.skillStats[selectedSkill]!.byGame[activity.key]
                          : null;
                      const questionCount =
                        skillSlice?.questionCount ?? detail?.questionCount ?? 0;
                      const grammarExerciseCards =
                        selectedSkill === 'writing' && activity.key === 'grammar'
                          ? data.gameExercises?.grammar || []
                          : [];
                      // Hide every game card with no question content (all grades).
                      if (activity.live && questionCount <= 0) {
                        return [];
                      }
                      const progress = activityProgress(
                        detail,
                        activity.live,
                        skillSlice,
                        comingSoonLabel
                      );
                      const className = 'activity-card';
                      const activityLabel = t(`games.${activity.key}`);
                      const inner = (
                        <>
                          <div className="activity-left">
                            <div className={`activity-icon ${activity.iconClass}`}>
                              <i className={activity.icon} aria-hidden="true" />
                            </div>
                            <span className="activity-label">{activityLabel}</span>
                          </div>
                          <span className="activity-progress">{progress}</span>
                        </>
                      );

                      if (activity.live) {
                        if (grammarExerciseCards.length > 1) {
                          return grammarExerciseCards.map((card) => (
                            <Link
                              key={`${activity.key}-${card.key}`}
                              href={`/games/${activity.slug}/${data.course.id}?exercise=${encodeURIComponent(card.key)}`}
                              className={className}
                              data-activity={`${activity.key}:${card.key}`}
                            >
                              <div className="activity-left">
                                <div className={`activity-icon ${activity.iconClass}`}>
                                  <i className={activity.icon} aria-hidden="true" />
                                </div>
                                <span className="activity-label">
                                  {localizeExerciseTitle(t, card.key, card.label)}
                                </span>
                              </div>
                              <span className="activity-progress">
                                {card.completedCount}/{card.questionCount}
                              </span>
                            </Link>
                          ));
                        }
                        const href =
                          activity.key === 'quiz' && selectedSkill
                            ? `/games/${activity.slug}/${data.course.id}?skill=${selectedSkill}`
                            : `/games/${activity.slug}/${data.course.id}`;
                        return [
                          <Link
                            key={activity.key}
                            href={href}
                            className={className}
                            data-activity={activity.key}
                          >
                            {inner}
                          </Link>,
                        ];
                      }

                      return [
                        <div
                          key={activity.key}
                          className={className}
                          data-activity={activity.key}
                          aria-disabled="true"
                        >
                          {inner}
                        </div>,
                      ];
                    });

                    if (gameCards.length === 0 && selectedSkill !== 'speaking') {
                      return (
                        <div className="ebook-empty" style={{ gridColumn: '1 / -1' }}>
                          {t('course.noGamesForSkill')}
                        </div>
                      );
                    }
                    return gameCards;
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CourseDetailView({
  courseId,
  initialData,
  initialSkill = null,
}: CourseDetailViewProps) {
  const { t } = useI18n();
  const player = usePlayer();
  const [data, setData] = useState<CourseDetailData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState('');
  const didUseInitialData = useRef(Boolean(initialData));

  useEffect(() => {
    if (player.kind !== 'guest' || !initialData) return;
    setData(hydrateGuestCourseDetail(initialData));
  }, [initialData, player.kind]);

  useEffect(() => {
    if (didUseInitialData.current && initialData?.course.id === courseId) {
      didUseInitialData.current = false;
      return;
    }

    const controller = new AbortController();

    async function loadCourse() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as CourseDetailResponse;
        if (!res.ok || !json.success || !json.course) {
          throw new Error(json.message || t('course.loadFailed'));
        }
        const nextData: CourseDetailData = {
          success: true,
          course: json.course,
          games: json.games,
          gameExercises: json.gameExercises,
          skillStats: json.skillStats,
          totalScore: json.totalScore ?? 0,
          playerKind: json.playerKind,
        };
        setData(player.kind === 'guest' ? hydrateGuestCourseDetail(nextData) : nextData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setData(null);
        setErrorMessage(err instanceof Error ? err.message : t('course.loadFailed'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (courseId) {
      loadCourse();
    } else {
      setData(null);
      setErrorMessage(t('course.notFound'));
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [courseId, initialData, player.kind, t]);

  if (isLoading) {
    return <DataLoading />;
  }

  if (errorMessage || !data) {
    return <DataLoading variant="message" message={errorMessage || t('course.notFound')} />;
  }

  return (
    <Suspense fallback={<DataLoading />}>
      <CourseDetailContent data={data} initialSkill={initialSkill} />
    </Suspense>
  );
}

// Re-export for tests that may reference ProgressStatus
export type { ProgressStatus };
