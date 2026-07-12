import Link from 'next/link';

import { DataLoading } from '@/components/DataLoading';

export type CourseListItem = {
  id: string;
  name: string;
  className: string;
  levelName: string;
};

type CourseListProps = {
  courses: CourseListItem[];
};

export function CourseList({ courses }: CourseListProps) {
  if (courses.length === 0) {
    return <DataLoading variant="message" message="Chưa có khóa học phù hợp" />;
  }

  return (
    <div className="course-grid" id="courseGrid">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          className="course-card"
          data-course={course.name}
          data-level={course.levelName}
        >
          <div className="course-thumb-placeholder">
            <i className="fas fa-book thumb-icon" aria-hidden="true" />
          </div>
          <div className="course-title">{course.name}</div>
        </Link>
      ))}
    </div>
  );
}
