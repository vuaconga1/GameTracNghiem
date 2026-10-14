import { redirect } from 'next/navigation';

import { TeacherAuditLog } from '@/features/admin/TeacherAuditLog';
import { requireAdminOrTeacher } from '@/lib/auth';

export default async function AdminAuditPage() {
  const session = await requireAdminOrTeacher();
  if (session.role !== 'admin') redirect('/admin/classes');
  return <TeacherAuditLog displayName={session.displayName} />;
}
