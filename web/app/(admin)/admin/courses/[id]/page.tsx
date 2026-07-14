import { CourseDetailAdmin } from '@/features/admin/CourseDetailAdmin';
import { requireAdmin } from '@/lib/auth';

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  return <CourseDetailAdmin displayName={session.displayName} courseId={id} />;
}
