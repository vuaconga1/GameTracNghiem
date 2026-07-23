import { HomeCoursesView } from '@/features/courses/HomeCoursesView';
import { readHomeCoursesLevelParam } from '@/lib/homeCoursesFilterState';
import { loadHomeCourses } from '@/lib/loadHomeCourses';

type HomePageProps = {
  searchParams?: Promise<{
    levelName?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialLevelName = readHomeCoursesLevelParam(params?.levelName);
  const initialData = await loadHomeCourses(initialLevelName);

  return <HomeCoursesView initialData={initialData} />;
}
