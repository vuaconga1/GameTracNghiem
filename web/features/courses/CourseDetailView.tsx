'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { PageBackButton } from '@/components/PageBackButton';
import { EbookViewer } from '@/features/courses/EbookViewer';
import { resolveCourseEbookPagesForSkill } from '@/lib/courseSkillLesson';
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

function activityProgress(detail: GameDetail | undefined, live: boolean) {
  if (!live) return 'Sắp có';
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

function formatCourseScore(points: number) {
  return Number(points).toLocaleString('vi-VN');
}

export function CourseDetailContent({
  data,
  initialTab = 'exercises',
  initialSkill = null,
}: CourseDetailContentProps) {
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
  const showBookCard = activeTab === 'exercises';
  const showSkillCards = activeTab === 'exercises' && !selectedSkill;
  const showGameGrid = activeTab === 'exercises' && Boolean(selectedSkill);
  const selectedSkillMeta = skillCards.find((skill) => skill.id === selectedSkill);
  const backHref = selectedSkill ? `/courses/${data.course.id}` : '/';
  const lessonPages = resolveCourseEbookPagesForSkill({
    skillId: selectedSkill,
    unitEbook: data.course.ebook
      ? { pageStart: data.course.ebook.pageStart, pageEnd: data.course.ebook.pageEnd }
      : null,
    skillLessons: data.course.skillLessons,
  });

  return (
    <section id="view-detail" className="view-detail">
      <PageBackButton href={backHref} title="Quay lại" />

      <div className={activeTab === 'lesson' ? 'detail-body detail-body--lesson-full' : 'detail-body'}>
        {showBookCard ? (
          <div className="book-card">
            <div className="book-card-top">
              <div className="book-thumb">
                <i className="fas fa-book" aria-hidden="true" />
              </div>
              <div className="book-info">
                <h2>{data.course.name}</h2>
                <p>{data.course.levelName}</p>
              </div>
            </div>
            {totalQuestions > 0 ? (
              <div className="book-stats">
                <div className="book-stat">
                  <div className="book-stat-value">
                    {completedQuestions}/{totalQuestions}
                  </div>
                  <div className="book-stat-label">câu đã làm</div>
                </div>
                <div className="book-stat">
                  <div className="book-stat-value">{formatCourseScore(totalScore)}</div>
                  <div className="book-stat-label">tổng điểm</div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="detail-main-panel">
          <div className="detail-tabs tabs-secondary">
            <button
              type="button"
              className={activeTab === 'exercises' ? 'tab-secondary active' : 'tab-secondary'}
              data-detail-tab="exercises"
              onClick={() => setActiveTab('exercises')}
            >
              <i className="fas fa-gamepad" aria-hidden="true" /> Bài tập
            </button>
            <button
              type="button"
              className={activeTab === 'lesson' ? 'tab-secondary active' : 'tab-secondary'}
              data-detail-tab="lesson"
              onClick={() => setActiveTab('lesson')}
            >
              <i className="fas fa-book-open" aria-hidden="true" /> Bài học
            </button>
          </div>

          <div className={activeTab === 'lesson' ? 'detail-panel' : 'detail-panel is-hidden'}>
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
                    ? 'Chưa gán trang bài học cho kỹ năng này'
                    : 'Chưa gắn sách bài học cho unit này. Admin hãy chọn PDF và khoảng trang trong chi tiết khóa học.'}
                </div>
              </div>
            )}
          </div>

          <div className={activeTab === 'exercises' ? 'detail-panel' : 'detail-panel is-hidden'}>
            <div className="activity-area">
              {showSkillCards ? (
                <div className="activity-grid skill-grid" data-skill-step="skills">
                  {skillCards.length === 0 ? (
                    <div className="ebook-empty">Chưa có kỹ năng nào được mở trong khóa này.</div>
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
                      const stats = aggregateActivityStats(data.games, liveKeys);
                      const progress =
                        stats.totalQuestions > 0
                          ? `${stats.completedQuestions}/${stats.totalQuestions}`
                          : skillGames.length === 0
                            ? 'Chưa có bài'
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
                            <span className="activity-label">{skill.label}</span>
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
                      {selectedSkillMeta.label}
                    </div>
                  ) : null}
                  {activities.length === 0 ? (
                    <div className="ebook-empty" style={{ gridColumn: '1 / -1' }}>
                      Chưa có bài tập cho kỹ năng này.
                    </div>
                  ) : (
                    activities.map((activity) => {
                      const detail = data.games?.[activity.key];
                      const progress = activityProgress(detail, activity.live);
                      const className = 'activity-card';
                      const inner = (
                        <>
                          <div className="activity-left">
                            <div className={`activity-icon ${activity.iconClass}`}>
                              <i className={activity.icon} aria-hidden="true" />
                            </div>
                            <span className="activity-label">{activity.label}</span>
                          </div>
                          <span className="activity-progress">{progress}</span>
                        </>
                      );

                      if (activity.live) {
                        const href =
                          activity.key === 'quiz' && selectedSkill
                            ? `/games/${activity.slug}/${data.course.id}?skill=${selectedSkill}`
                            : `/games/${activity.slug}/${data.course.id}`;
                        return (
                          <Link
                            key={activity.key}
                            href={href}
                            className={className}
                            data-activity={activity.key}
                          >
                            {inner}
                          </Link>
                        );
                      }

                      return (
                        <div
                          key={activity.key}
                          className={className}
                          data-activity={activity.key}
                          aria-disabled="true"
                        >
                          {inner}
                        </div>
                      );
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
          throw new Error(json.message || 'Không tải được khóa học');
        }
        setData({
          success: true,
          course: json.course,
          games: json.games,
          totalScore: json.totalScore ?? 0,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setData(null);
        setErrorMessage(err instanceof Error ? err.message : 'Không tải được khóa học');
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
      setErrorMessage('Không tìm thấy khóa học');
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [courseId, initialData]);

  if (isLoading) {
    return <DataLoading />;
  }

  if (errorMessage || !data) {
    return <DataLoading variant="message" message={errorMessage || 'Không tìm thấy khóa học'} />;
  }

  return (
    <Suspense fallback={<DataLoading />}>
      <CourseDetailContent data={data} initialSkill={initialSkill} />
    </Suspense>
  );
}

// Re-export for tests that may reference ProgressStatus
export type { ProgressStatus };
