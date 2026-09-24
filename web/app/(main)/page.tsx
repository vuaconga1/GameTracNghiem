import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { HomeCoursesView } from '@/features/courses/HomeCoursesView';
import { lookupSessionForPage } from '@/lib/auth';
import {
  HOME_COURSES_LEVEL_COOKIE,
  normalizeHomeCoursesLevelName,
  readHomeCoursesLevelParam,
} from '@/lib/homeCoursesFilterState';
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

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(HOME_COURSES_LEVEL_COOKIE)?.value;
  let cookieLevel = '';
  if (rawCookie) {
    try {
      cookieLevel = normalizeHomeCoursesLevelName(decodeURIComponent(rawCookie));
    } catch {
      cookieLevel = normalizeHomeCoursesLevelName(rawCookie);
    }
  }
  const queryLevel = readHomeCoursesLevelParam(params?.levelName);
  const initialLevelName = queryLevel || cookieLevel;

  if (isLogisticsLevel(initialLevelName)) {
    redirect('/logistics');
  }
  const initialData = await loadHomeCourses(initialLevelName);

  return <HomeCoursesView initialData={initialData} />;
}
