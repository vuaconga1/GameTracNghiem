import { AccountSettings } from '@/features/admin/AccountSettings';
import { requireAdminOrTeacher } from '@/lib/auth';

export default async function AdminAccountPage() {
  const session = await requireAdminOrTeacher();
  return (
    <AccountSettings
      displayName={session.displayName}
      username={session.username}
      isAdmin={session.role === 'admin'}
    />
  );
}
