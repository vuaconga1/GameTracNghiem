'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PageBackButton } from '@/components/PageBackButton';
import { EbookViewer } from '@/features/courses/EbookViewer';
import { localizeExerciseTitle } from '@/features/games/localizeExerciseTitle';
import {
  isLogisticsLevelName,
  resolveCourseEbookPagesForSkill,
  resolveDirectUnitLessonPages,
} from '@/lib/courseSkillLesson';
import { GAME_CATALOG, type ProgressStatus } from '@/lib/gameCatalog';
import type {
  CourseDetail,
  CourseDetailData,
  CourseGames,
  GameDetail,
} from '@/lib/loadCourseDetail';
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

type DetailTab = 'lesson' | 'exercises';

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

export function CourseDetailContent({
  data,
  initialTab = 'exercises',
  initialSkill = null,
}: CourseDetailContentProps) {
  const { t, formatClassLevel, locale } = useI18n();
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
  const logisticsDirectLesson = isLogisticsLevelName(data.course.levelName);
  const selectedSkill =
    !logisticsDirectLesson && skillFromUrl && enabledSkills.includes(skillFromUrl)
      ? skillFromUrl
      : null;
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
  const showSkillTabs = Boolean(selectedSkill) && !logisticsDirectLesson;
  const effectiveTab: DetailTab = logisticsDirectLesson
    ? 'lesson'
    : showSkillTabs
      ? activeTab
      : 'exercises';
  const showBookCard = effectiveTab === 'exercises';
  const showSkillCards = effectiveTab === 'exercises' && !selectedSkill;
  const showGameGrid = effectiveTab === 'exercises' && Boolean(selectedSkill);
  const selectedSkillMeta = skillCards.find((skill) => skill.id === selectedSkill);
  const backHref = selectedSkill ? `/courses/${data.course.id}` : '/';
  const unitEbook = data.course.ebook
    ? { pageStart: data.course.ebook.pageStart, pageEnd: data.course.ebook.pageEnd }
    : null;
  const lessonPages = logisticsDirectLesson
    ? resolveDirectUnitLessonPages({
        unitEbook,
        skillLessons: data.course.skillLessons,
      })
    : resolveCourseEbookPagesForSkill({
        skillId: selectedSkill,
        unitEbook,
        skillLessons: data.course.skillLessons,
      });
  const showLessonViewer =
    logisticsDirectLesson || (showSkillTabs && effectiveTab === 'lesson');
  const comingSoonLabel = t('course.comingSoon');

  return (
    <section id="view-detail" className="view-detail">
      <PageBackButton href={backHref} />

      <div className={effectiveTab === 'lesson' ? 'detail-body detail-body--lesson-full' : 'detail-body'}>
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
            </div>
          ) : null}

          {showLessonViewer ? (
            <div
              className={
                logisticsDirectLesson || effectiveTab === 'lesson'
                  ? 'detail-panel'
                  : 'detail-panel is-hidden'
              }
            >
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

          <div
            className={
              !logisticsDirectLesson && effectiveTab === 'exercises'
                ? 'detail-panel'
                : 'detail-panel is-hidden'
            }
          >
            <div className="activity-area">
              {showSkillCards ? (
                <div className="activity-grid skill-grid" data-skill-step="skills">
                  {skillCards.length === 0 ? (
                    <div className="ebook-empty">{t('course.noSkills')}</div>
                  ) : (
                    skillCards.map((skill) => {
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
                          : skillGames.length === 0
                            ? t('course.noExercisesYet')
                            : '—';
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
                    })
                  )}
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
                  {activities.length === 0 && selectedSkill !== 'speaking' ? (
                    <div className="ebook-empty" style={{ gridColumn: '1 / -1' }}>
                      {t('course.noGamesForSkill')}
                    </div>
                  ) : (
                    activities.flatMap((activity) => {
                      const detail = data.games?.[activity.key];
                      const skillSlice =
                        selectedSkill && data.skillStats?.[selectedSkill]?.byGame?.[activity.key]
                          ? data.skillStats[selectedSkill]!.byGame[activity.key]
                          : null;
                      const grammarExerciseCards =
                        selectedSkill === 'writing' && activity.key === 'grammar'
                          ? data.gameExercises?.grammar || []
                          : [];
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
                        // Hide skill-scoped games that have zero questions for this skill.
                        if (skillSlice && skillSlice.questionCount <= 0) {
                          return [];
                        }
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
                    })
                  )}
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
  const [data, setData] = useState<CourseDetailData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState('');
  const didUseInitialData = useRef(Boolean(initialData));

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
        setData({
          success: true,
          course: json.course,
          games: json.games,
          gameExercises: json.gameExercises,
          skillStats: json.skillStats,
          totalScore: json.totalScore ?? 0,
        });
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
  }, [courseId, initialData, t]);

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
