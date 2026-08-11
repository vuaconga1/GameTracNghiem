import { LogisticsCoursesView } from '@/features/courses/LogisticsCoursesView';
import { loadLogisticsWeekCourses } from '@/lib/loadLogisticsWeekCourses';

export default async function LogisticsWeek1Page() {
  const initialData = await loadLogisticsWeekCourses(1);
  return <LogisticsCoursesView week={1} initialData={initialData} />;
}
