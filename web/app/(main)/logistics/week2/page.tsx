import { LogisticsCoursesView } from '@/features/courses/LogisticsCoursesView';
import { loadLogisticsWeekCourses } from '@/lib/loadLogisticsWeekCourses';

export default async function LogisticsWeek2Page() {
  const initialData = await loadLogisticsWeekCourses(2);
  return <LogisticsCoursesView week={2} initialData={initialData} />;
}
