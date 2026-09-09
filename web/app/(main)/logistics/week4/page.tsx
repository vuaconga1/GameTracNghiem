import { LogisticsCoursesView } from '@/features/courses/LogisticsCoursesView';
import { lookupSessionForPage } from '@/lib/auth';
import { loadLogisticsWeekCourses } from '@/lib/loadLogisticsWeekCourses';
import { normalizeUserRole } from '@/lib/userRoles';
import { redirect } from 'next/navigation';

export default async function LogisticsWeek4Page() {
  const { session } = await lookupSessionForPage();
  if (session && normalizeUserRole(session.role) === 'WewinStudent') {
    redirect('/');
  }
  const initialData = await loadLogisticsWeekCourses(4);
  return <LogisticsCoursesView week={4} initialData={initialData} />;
}
