'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

function coursesUrl(className: string, levelName: string) {
  const params = new URLSearchParams({ className, levelName });
  return `/api/courses?${params.toString()}`;
}

export function HomeCoursesView() {
  const [className, setClassName] = useState('');
  const [levelName, setLevelName] = useState('');
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [filters, setFilters] = useState<CourseFiltersData>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filtersRoot, setFiltersRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setFiltersRoot(document.getElementById('sidebar-filters-root'));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourses() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(coursesUrl(className, levelName), {
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

  const filtersNode = (
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
  );

  return (
    <>
      {filtersRoot ? createPortal(filtersNode, filtersRoot) : null}

      <section id="view-courses" className="courses-area">
        <div className="courses-header">
          <div className="courses-header-icon">
            <i className="fas fa-graduation-cap" aria-hidden="true" />
          </div>
          <span className="courses-header-text">Khóa học</span>
          <i className="fas fa-chevron-down" aria-hidden="true" />
        </div>

        {isLoading ? (
          <DataLoading />
        ) : errorMessage ? (
          <DataLoading variant="message" message={errorMessage} />
        ) : (
          <CourseList courses={courses} />
        )}
      </section>
    </>
  );
}
