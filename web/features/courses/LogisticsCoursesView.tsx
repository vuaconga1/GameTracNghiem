'use client';

import { useLayoutEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { usePlayer } from '@/components/player/PlayerContext';
import { CourseList, type CourseListItem } from '@/features/courses/CourseList';
import { courseCompletionPercent } from '@/lib/courseProgress';
import type { HomeCoursesData } from '@/lib/loadHomeCourses';
import type { LogisticsWeek } from '@/lib/logisticsUnits';
import { readGuestGameState } from '@/lib/player/guestPlayerAdapter';

function hydrateGuestCourses(courses: CourseListItem[], isGuest: boolean): CourseListItem[] {
  if (!isGuest) return courses;
  return courses.map((course) => {
    if (!course.courseKey || !course.enabledGames || !course.questionCounts) return course;
    const progress = Object.fromEntries(
      course.enabledGames.map((game) => [
        game,
        readGuestGameState(course.courseKey!, game).statuses,
      ]),
    );
    return {
      ...course,
      completionPercent: courseCompletionPercent({
        enabledGames: course.enabledGames,
        questionCounts: course.questionCounts,
        progress,
      }),
    };
  });
}

type LogisticsCoursesViewProps = {
  week: LogisticsWeek;
  initialData: HomeCoursesData;
};

export function LogisticsCoursesView({ week, initialData }: LogisticsCoursesViewProps) {
  const { t } = useI18n();
  const player = usePlayer();
  const [courses, setCourses] = useState<CourseListItem[]>(initialData.courses);
  const titleKey = week === 2 ? 'logistics.week2' : 'logistics.week1';

  useLayoutEffect(() => {
    if (player.kind !== 'guest') return;
    setCourses((current) => hydrateGuestCourses(current, true));
  }, [player.kind]);

  return (
    <section id="view-courses" className="courses-area">
      <div className="courses-header">
        <div className="courses-header-icon">
          <i className="fas fa-truck" aria-hidden="true" />
        </div>
        <span className="courses-header-text">{t(titleKey)}</span>
        <i className="fas fa-chevron-down" aria-hidden="true" />
      </div>

      {courses.length === 0 ? (
        <DataLoading variant="message" message={t('home.emptyFiltered')} />
      ) : (
        <CourseList courses={courses} />
      )}
    </section>
  );
}
