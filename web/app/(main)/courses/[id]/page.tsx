import { CourseDetailView } from '@/features/courses/CourseDetailView';
import { loadCourseDetail } from '@/lib/loadCourseDetail';
import { parseSkillQuery } from '@/lib/skillCatalog';

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ skill?: string }>;
}) {
  const { id } = await params;
  const { skill } = await searchParams;
  const initialData = await loadCourseDetail(id);
  const initialSkill = parseSkillQuery(skill);

  return (
    <CourseDetailView courseId={id} initialData={initialData} initialSkill={initialSkill} />
  );
}
