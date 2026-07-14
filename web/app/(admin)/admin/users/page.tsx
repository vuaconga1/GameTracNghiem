import { UserManager } from '@/features/admin/UserManager';
import { requireAdmin } from '@/lib/auth';

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  return <UserManager displayName={session.displayName} currentUserId={session.userId} />;
}
