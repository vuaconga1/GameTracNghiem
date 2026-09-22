import { redirect } from 'next/navigation';

import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { requireAdminOrTeacher } from '@/lib/auth';

export default async function AdminHomePage() {
  const session = await requireAdminOrTeacher();
  if (session.role === 'teacher') {
    redirect('/admin/classes');
  }
  return <AdminDashboard displayName={session.displayName} />;
}
