'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

import { DataLoading } from '@/components/DataLoading';
import { CourseFilters } from '@/features/courses/CourseFilters';
import { CourseList, type CourseListItem } from '@/features/courses/CourseList';
import {
  buildHomeCoursesHref,
  currentBrowserHref,
  HOME_COURSES_LEVEL_STORAGE_KEY,
  normalizeHomeCoursesLevelName,
  readHomeCoursesLevelFromSearch,
  resolveClientHomeCoursesLevel,
} from '@/lib/homeCoursesFilterState';
import type { HomeCoursesData } from '@/lib/loadHomeCourses';

type CourseFiltersData = HomeCoursesData['filters'];

type CoursesResponse = {
  success: boolean;
  courses?: CourseListItem[];
  filters?: CourseFiltersData;
  selectedLevelName?: string;
  message?: string;
};

const EMPTY_FILTERS: CourseFiltersData = {
  levels: [],
};

function coursesUrl(levelName: string) {
  const params = new URLSearchParams();
  if (levelName) params.set('levelName', levelName);
  return `/api/courses?${params.toString()}`;
}

type HomeCoursesViewProps = {
  initialData?: HomeCoursesData;
};

export function HomeCoursesView({ initialData }: HomeCoursesViewProps) {
  const pathname = usePathname();
  const initialSelectedLevelName = normalizeHomeCoursesLevelName(initialData?.selectedLevelName);
  const [levelName, setLevelName] = useState(initialSelectedLevelName);
  const [courses, setCourses] = useState<CourseListItem[]>(initialData?.courses || []);
  const [filters, setFilters] = useState<CourseFiltersData>(initialData?.filters || EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState('');
  const [filtersRoot, setFiltersRoot] = useState<HTMLElement | null>(null);
  const didUseInitialData = useRef(Boolean(initialData));
  const didInitializeLevel = useRef(false);

  useEffect(() => {
    setFiltersRoot(document.getElementById('sidebar-filters-root'));
  }, []);

  useLayoutEffect(() => {
    if (didInitializeLevel.current) return;
    didInitializeLevel.current = true;

    const urlLevelName = readHomeCoursesLevelFromSearch(window.location.search);
    const storedLevelName = normalizeHomeCoursesLevelName(
      window.localStorage.getItem(HOME_COURSES_LEVEL_STORAGE_KEY)
    );
    const resolvedLevelName = resolveClientHomeCoursesLevel({
      urlLevelName,
      storedLevelName,
      serverLevelName: initialSelectedLevelName,
    });

    if (urlLevelName) {
      window.localStorage.setItem(HOME_COURSES_LEVEL_STORAGE_KEY, urlLevelName);
    } else if (resolvedLevelName) {
      window.localStorage.setItem(HOME_COURSES_LEVEL_STORAGE_KEY, resolvedLevelName);
    }

    if (resolvedLevelName !== initialSelectedLevelName) {
      setLevelName(resolvedLevelName);
    }

    const nextHref = buildHomeCoursesHref(pathname, window.location.search, resolvedLevelName);
    if (nextHref !== currentBrowserHref()) {
      window.history.replaceState(null, '', nextHref);
    }
  }, [initialSelectedLevelName, pathname]);

  useEffect(() => {
    if (!didInitializeLevel.current) return;

    function handlePopState() {
      const urlLevelName = readHomeCoursesLevelFromSearch(window.location.search);
      if (urlLevelName) {
        setLevelName(urlLevelName);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!didInitializeLevel.current) return;

    const normalizedLevelName = normalizeHomeCoursesLevelName(levelName);
    if (normalizedLevelName) {
      window.localStorage.setItem(HOME_COURSES_LEVEL_STORAGE_KEY, normalizedLevelName);
    } else {
      window.localStorage.removeItem(HOME_COURSES_LEVEL_STORAGE_KEY);
    }
  }, [levelName]);

  useEffect(() => {
    if (!didInitializeLevel.current) return;

    const nextHref = buildHomeCoursesHref(pathname, window.location.search, levelName);
    if (nextHref === currentBrowserHref()) return;
    window.history.replaceState(null, '', nextHref);
  }, [levelName, pathname]);

  useEffect(() => {
    if (didUseInitialData.current && levelName === initialSelectedLevelName) {
      didUseInitialData.current = false;
      return;
    }

    const controller = new AbortController();

    async function loadCourses() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(coursesUrl(levelName), {
          signal: controller.signal,
        });
        const data = (await res.json()) as CoursesResponse;
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Không tải được danh sách khóa học');
        }

        setCourses(data.courses || []);
        setFilters(data.filters || EMPTY_FILTERS);
        if (!levelName && data.selectedLevelName) {
          setLevelName(data.selectedLevelName);
        }
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
  }, [initialSelectedLevelName, levelName]);

  const filtersNode = (
    <CourseFilters
      levels={filters.levels}
      levelName={levelName}
      disabled={isLoading}
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
