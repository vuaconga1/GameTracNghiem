import { redirect } from 'next/navigation';

import { HomeCoursesView } from '@/features/courses/HomeCoursesView';
import { readHomeCoursesLevelParam } from '@/lib/homeCoursesFilterState';
import { loadHomeCourses } from '@/lib/loadHomeCourses';
import { isLogisticsLevel } from '@/lib/logisticsUnits';

type HomePageProps = {
  searchParams?: Promise<{
    levelName?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialLevelName = readHomeCoursesLevelParam(params?.levelName);
  if (isLogisticsLevel(initialLevelName)) {
    redirect('/logistics');
  }
  const initialData = await loadHomeCourses(initialLevelName);

  return <HomeCoursesView initialData={initialData} />;
}
