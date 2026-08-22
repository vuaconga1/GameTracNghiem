import { redirect } from 'next/navigation';

import { HomeCoursesView } from '@/features/courses/HomeCoursesView';
import { lookupSessionForPage } from '@/lib/auth';
import { readHomeCoursesLevelParam } from '@/lib/homeCoursesFilterState';
import { loadHomeCourses } from '@/lib/loadHomeCourses';
import { isLogisticsLevel } from '@/lib/logisticsUnits';
import { normalizeUserRole } from '@/lib/userRoles';

type HomePageProps = {
  searchParams?: Promise<{
    levelName?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const { session } = await lookupSessionForPage();
  if (session && normalizeUserRole(session.role) === 'LogisticsStudent') {
    redirect('/logistics');
  }
  const initialLevelName = readHomeCoursesLevelParam(params?.levelName);
  if (isLogisticsLevel(initialLevelName)) {
    redirect('/logistics');
  }
  const initialData = await loadHomeCourses(initialLevelName);

  return <HomeCoursesView initialData={initialData} />;
}
