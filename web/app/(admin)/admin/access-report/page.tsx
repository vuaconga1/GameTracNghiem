import { redirect } from 'next/navigation';

import { AccessReport } from '@/features/admin/AccessReport';
import { requireAdminOrTeacher } from '@/lib/auth';

export default async function AdminAccessReportPage() {
  const session = await requireAdminOrTeacher();
  if (session.role !== 'admin') redirect('/admin/classes');
  return <AccessReport displayName={session.displayName} />;
}
