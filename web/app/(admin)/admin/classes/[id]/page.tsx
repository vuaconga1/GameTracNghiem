import { ClassDetailAdmin } from '@/features/admin/ClassDetailAdmin';
import { requireAdminOrTeacher } from '@/lib/auth';

type Props = { params: Promise<{ id: string }> };

export default async function AdminClassDetailPage({ params }: Props) {
  const session = await requireAdminOrTeacher();
  const { id } = await params;
  return <ClassDetailAdmin classId={id} displayName={session.displayName} isAdmin={session.role === 'admin'} />;
}
