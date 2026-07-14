import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { requireAdmin } from '@/lib/auth';

export default async function AdminHomePage() {
  const session = await requireAdmin();
  return <AdminDashboard displayName={session.displayName} />;
}
