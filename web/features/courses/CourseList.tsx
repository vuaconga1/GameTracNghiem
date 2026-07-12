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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          className="group rounded-[1.5rem] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[0_14px_40px_rgba(13,43,110,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[0_18px_50px_rgba(13,43,110,0.1)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-gold)]">
            {course.className}
          </p>
          <h2 className="mt-3 text-2xl font-black text-[var(--primary)]">{course.name}</h2>
          <p className="mt-2 font-bold text-[var(--text-muted)]">{course.levelName}</p>
          <span className="mt-5 inline-flex rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-[var(--white)]">
            Vào khóa học
          </span>
        </Link>
      ))}
    </div>
  );
}
