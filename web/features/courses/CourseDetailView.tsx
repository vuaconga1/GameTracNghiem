'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';

export type CourseDetail = {
  id: string;
  name: string;
  className: string;
  levelName: string;
  courseKey: string;
};

type GrammarGameDetail = {
  questionCount: number;
  statuses: string[];
};

type CourseGames = {
  grammar?: GrammarGameDetail;
};

export type CourseDetailData = {
  success: true;
  course: CourseDetail;
  games?: CourseGames;
};

type CourseDetailResponse = {
  success: boolean;
  course?: CourseDetail;
  games?: CourseGames;
  message?: string;
};

type CourseDetailContentProps = {
  data: CourseDetailData;
};

type CourseDetailViewProps = {
  courseId: string;
};

type DetailTab = 'lesson' | 'exercises';

type Activity = {
  key: string;
  label: string;
  iconClass: string;
  icon: string;
};

const COMING_SOON_ACTIVITIES: Activity[] = [
  {
    key: 'quiz',
    label: 'Trắc nghiệm',
    iconClass: 'quiz',
    icon: 'fas fa-file-alt',
  },
  {
    key: 'pronunciation',
    label: 'Phát âm',
    iconClass: 'pronunciation',
    icon: 'fas fa-microphone',
  },
  {
    key: 'scramble',
    label: 'Sắp xếp từ',
    iconClass: 'scramble',
    icon: 'fas fa-shuffle',
  },
  {
    key: 'word_match',
    label: 'Nối từ với hình',
    iconClass: 'word-match',
    icon: 'fas fa-image',
  },
  {
    key: 'look_and_write',
    label: 'Nhìn và viết',
    iconClass: 'look-write',
    icon: 'fas fa-images',
  },
  {
    key: 'choose_and_circle',
    label: 'Chọn và khoanh',
    iconClass: 'choose-circle',
    icon: 'fas fa-circle-dot',
  },
  {
    key: 'read_and_complete',
    label: 'Đọc và hoàn thành',
    iconClass: 'read-complete',
    icon: 'fas fa-pen-fancy',
  },
  {
    key: 'read_and_match',
    label: 'Đọc và nối',
    iconClass: 'read-match',
    icon: 'fas fa-link',
  },
  {
    key: 'vocabulary_test',
    label: 'Kiểm tra từ vựng',
    iconClass: 'vocab-test',
    icon: 'fas fa-table-cells',
  },
  {
    key: 'vocabulary_check',
    label: 'Kiểm tra đúng sai',
    iconClass: 'vocab-check',
    icon: 'fas fa-check-double',
  },
];

function completedStatusCount(statuses: string[] | undefined) {
  return (statuses || []).filter((status) => status !== 'empty').length;
}

function grammarProgress(grammar: GrammarGameDetail | undefined) {
  if (!grammar) return '—';

  return `${completedStatusCount(grammar.statuses)}/${grammar.questionCount}`;
}

export function CourseDetailContent({ data }: CourseDetailContentProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('lesson');
  const grammar = data.games?.grammar;

  return (
    <section id="view-detail" className="view-detail">
      <Link href="/" className="detail-back">
        <i className="fas fa-arrow-left" aria-hidden="true" />
        Quay lại
      </Link>

      <div className="detail-body">
        <div className="book-card">
          <div className="book-card-top">
            <div className="book-thumb">
              <i className="fas fa-book" aria-hidden="true" />
            </div>
            <div className="book-info">
              <h2>{data.course.name}</h2>
              <p>
                {data.course.className} · {data.course.levelName}
              </p>
            </div>
          </div>
          {grammar ? (
            <div className="book-stats">
              <div className="book-stat">
                <div className="book-stat-value">{grammar.questionCount}</div>
                <div className="book-stat-label">câu ngữ pháp</div>
              </div>
              <div className="book-stat">
                <div className="book-stat-value">{completedStatusCount(grammar.statuses)}</div>
                <div className="book-stat-label">đã làm</div>
              </div>
            </div>
          ) : null}
        </div>

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
            <div className="ebook-viewer">
              <div className="ebook-toolbar">
                <div className="ebook-toolbar-group">
                  <button type="button" className="ebook-btn" title="Trang trước" disabled>
                    <i className="fas fa-chevron-left" aria-hidden="true" />
                  </button>
                  <span className="ebook-page-info">Trang —</span>
                  <button type="button" className="ebook-btn" title="Trang sau" disabled>
                    <i className="fas fa-chevron-right" aria-hidden="true" />
                  </button>
                </div>
                <div className="ebook-toolbar-group">
                  <button type="button" className="ebook-btn" title="Thu nhỏ" disabled>
                    <i className="fas fa-minus" aria-hidden="true" />
                  </button>
                  <button type="button" className="ebook-btn" title="Phóng to" disabled>
                    <i className="fas fa-plus" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="ebook-empty">Sách điện tử sẽ được kết nối sau.</div>
            </div>
          </div>

          <div className={activeTab === 'exercises' ? 'detail-panel' : 'detail-panel is-hidden'}>
            <div className="activity-area">
              <div className="activity-grid">
                <Link
                  href={`/games/grammar/${data.course.id}`}
                  className="activity-card"
                  data-activity="grammar"
                >
                  <div className="activity-left">
                    <div className="activity-icon grammar">
                      <i className="fas fa-book-open" aria-hidden="true" />
                    </div>
                    <span className="activity-label">Ngữ pháp</span>
                  </div>
                  <span className="activity-progress">{grammarProgress(grammar)}</span>
                </Link>

                {COMING_SOON_ACTIVITIES.map((activity) => (
                  <div
                    key={activity.key}
                    className="activity-card"
                    data-activity={activity.key}
                    aria-disabled="true"
                  >
                    <div className="activity-left">
                      <div className={`activity-icon ${activity.iconClass}`}>
                        <i className={activity.icon} aria-hidden="true" />
                      </div>
                      <span className="activity-label">{activity.label}</span>
                    </div>
                    <span className="activity-progress">Sắp có</span>
                  </div>
                ))}
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
