import 'server-only';

import type { HomeCoursesData } from '@/lib/loadHomeCourses';
import { loadHomeCourses } from '@/lib/loadHomeCourses';
import {
  LOGISTICS_LEVEL,
  logisticsCourseIdsForWeek,
  type LogisticsWeek,
} from '@/lib/logisticsUnits';

export async function loadLogisticsWeekCourses(week: LogisticsWeek): Promise<HomeCoursesData> {
  const data = await loadHomeCourses(LOGISTICS_LEVEL);
  const ids = logisticsCourseIdsForWeek(week);
  return {
    ...data,
    courses: data.courses.filter((course) => ids.has(course.id)),
  };
}
