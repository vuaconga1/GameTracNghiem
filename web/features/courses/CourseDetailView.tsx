'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { EbookViewer } from '@/features/courses/EbookViewer';
import { ALL_GAME_KEYS, GAME_CATALOG, type ProgressStatus } from '@/lib/gameCatalog';

export type CourseDetail = {
  id: string;
  name: string;
  levelName: string;
  courseKey: string;
  enabledGames?: string[];
  ebook?: {
    id: string;
    title: string;
    pageStart: number;
    pageEnd: number;
  } | null;
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
};

type CourseDetailViewProps = {
  courseId: string;
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

export function CourseDetailContent({ data, initialTab = 'lesson' }: CourseDetailContentProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const enabledKeys = new Set(
    data.course.enabledGames?.length ? data.course.enabledGames : ALL_GAME_KEYS
  );
  const activities = GAME_CATALOG.filter((activity) => enabledKeys.has(activity.key));
  const liveActivityKeys = activities.filter((activity) => activity.live).map((activity) => activity.key);
  const { totalQuestions, completedQuestions } = aggregateActivityStats(data.games, liveActivityKeys);
  const totalScore = data.totalScore ?? 0;
  const showBookCard = activeTab === 'exercises';

  return (
    <section id="view-detail" className="view-detail">
      <Link href="/" className="detail-back">
        <i className="fas fa-arrow-left" aria-hidden="true" />
        Quay lại
      </Link>

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
              className={activeTab === 'lesson' ? 'tab-secondary active' : 'tab-secondary'}
              data-detail-tab="lesson"
              onClick={() => setActiveTab('lesson')}
            >
              <i className="fas fa-book-open" aria-hidden="true" /> Bài học
            </button>
            <button
              type="button"
              className={activeTab === 'exercises' ? 'tab-secondary active' : 'tab-secondary'}
              data-detail-tab="exercises"
              onClick={() => setActiveTab('exercises')}
            >
              <i className="fas fa-gamepad" aria-hidden="true" /> Bài tập
            </button>
          </div>

          <div className={activeTab === 'lesson' ? 'detail-panel' : 'detail-panel is-hidden'}>
            {data.course.ebook ? (
              <EbookViewer
                ebookId={data.course.ebook.id}
                pageStart={data.course.ebook.pageStart}
                pageEnd={data.course.ebook.pageEnd}
              />
            ) : (
              <div className="ebook-viewer">
                <div className="ebook-empty">
                  Chưa gắn sách bài học cho unit này. Admin hãy chọn PDF và khoảng trang trong chi
                  tiết khóa học.
                </div>
              </div>
            )}
          </div>

          <div className={activeTab === 'exercises' ? 'detail-panel' : 'detail-panel is-hidden'}>
            <div className="activity-area">
              <div className="activity-grid">
                {activities.length === 0 ? (
                  <div className="ebook-empty">Chưa có bài tập nào được mở trong khóa này.</div>
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
                    return (
                      <Link
                        key={activity.key}
                        href={`/games/${activity.slug}/${data.course.id}`}
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CourseDetailView({ courseId }: CourseDetailViewProps) {
  const [data, setData] = useState<CourseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
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
  }, [courseId]);

  if (isLoading) {
    return <DataLoading />;
  }

  if (errorMessage || !data) {
    return <DataLoading variant="message" message={errorMessage || 'Không tìm thấy khóa học'} />;
  }

  return <CourseDetailContent data={data} />;
}

// Re-export for tests that may reference ProgressStatus
export type { ProgressStatus };
