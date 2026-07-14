import { ClassLevelManager } from '@/features/admin/ClassLevelManager';
import { requireAdmin } from '@/lib/auth';

export default async function AdminClassLevelsPage() {
  const session = await requireAdmin();
  return <ClassLevelManager displayName={session.displayName} />;
}
