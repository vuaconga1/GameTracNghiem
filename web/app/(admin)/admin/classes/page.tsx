import { ClassManager } from '@/features/admin/ClassManager';
import { requireAdminOrTeacher } from '@/lib/auth';

export default async function AdminClassesPage() {
  const session = await requireAdminOrTeacher();
  return (
    <ClassManager
      displayName={session.displayName}
      isAdmin={session.role === 'admin'}
    />
  );
}
