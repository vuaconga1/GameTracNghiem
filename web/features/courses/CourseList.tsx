/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';

import { DataLoading } from '@/components/DataLoading';

export type CourseListItem = {
  id: string;
  name: string;
  levelName: string;
  completionPercent: number;
  backgroundImageUrl?: string | null;
};

type CourseListProps = {
  courses: CourseListItem[];
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #ff9800, #f44336)',
  'linear-gradient(135deg, #2196f3, #03a9f4)',
  'linear-gradient(135deg, #9c27b0, #e91e63)',
  'linear-gradient(135deg, #4caf50, #8bc34a)',
  'linear-gradient(135deg, #00bcd4, #009688)',
  'linear-gradient(135deg, #ff5722, #ff9800)',
];

export function CourseList({ courses }: CourseListProps) {
  if (courses.length === 0) {
    return <DataLoading variant="message" message="Chưa có khóa học phù hợp" />;
  }

  return (
    <div className="course-grid" id="courseGrid">
      {courses.map((course, index) => {
        const completionPercent = Math.min(
          100,
          Math.max(0, Math.round(course.completionPercent || 0))
        );

        return (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="course-card"
            data-course={course.name}
            data-level={course.levelName}
          >
            {course.backgroundImageUrl ? (
              <img className="course-thumb" src={course.backgroundImageUrl} alt="" />
            ) : (
              <div
                className="course-thumb-placeholder"
                style={{ background: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length] }}
              >
                <i className="fas fa-book thumb-icon" aria-hidden="true" />
              </div>
            )}
            <div className="course-card-body">
              <div className="course-title">{course.name}</div>
              <div className="course-level">{course.levelName}</div>
              <div className="course-progress-text">{completionPercent}% hoàn thành</div>
              <span className="course-progress-track" aria-hidden="true">
                <span
                  className="course-progress-fill"
                  style={{ width: `${completionPercent}%` }}
                />
              </span>
              <span className="course-start-button">Bắt đầu học</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
