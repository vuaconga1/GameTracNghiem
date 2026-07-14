import { CourseManager } from '@/features/admin/CourseManager';
import { requireAdmin } from '@/lib/auth';

export default async function AdminCoursesPage() {
  const session = await requireAdmin();
  return <CourseManager displayName={session.displayName} />;
}
