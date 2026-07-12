'use client';

import { useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { CourseFilters } from '@/features/courses/CourseFilters';
import { CourseList, type CourseListItem } from '@/features/courses/CourseList';

type CourseFiltersData = {
  classes: string[];
  levels: string[];
};

type CoursesResponse = {
  success: boolean;
  courses?: CourseListItem[];
  filters?: CourseFiltersData;
  message?: string;
};

const EMPTY_FILTERS: CourseFiltersData = {
  classes: [],
  levels: [],
};

export default function HomePage() {
  const [className, setClassName] = useState('');
  const [levelName, setLevelName] = useState('');
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [filters, setFilters] = useState<CourseFiltersData>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (className) params.set('className', className);
    if (levelName) params.set('levelName', levelName);

    async function loadCourses() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/courses?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as CoursesResponse;
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Không tải được danh sách khóa học');
        }

        setCourses(data.courses || []);
        setFilters(data.filters || EMPTY_FILTERS);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setCourses([]);
        setErrorMessage(err instanceof Error ? err.message : 'Không tải được danh sách khóa học');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCourses();

    return () => controller.abort();
  }, [className, levelName]);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-8 shadow-[0_20px_60px_rgba(13,43,110,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-gold)]">
          WeWIN
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--primary)] sm:text-5xl">
          Chọn khóa học
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-bold text-[var(--text-muted)]">
          Lọc theo lớp và cấp độ, sau đó chọn khóa học để bắt đầu luyện tập.
        </p>
      </div>

      <CourseFilters
        classes={filters.classes}
        levels={filters.levels}
        className={className}
        levelName={levelName}
        disabled={isLoading}
        onClassNameChange={(value) => {
          setClassName(value);
          setLevelName('');
        }}
        onLevelNameChange={setLevelName}
      />

      {isLoading ? (
        <DataLoading />
      ) : errorMessage ? (
        <DataLoading variant="message" message={errorMessage} />
      ) : (
        <CourseList courses={courses} />
      )}
    </section>
  );
}
