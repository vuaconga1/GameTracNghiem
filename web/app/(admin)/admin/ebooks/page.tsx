import { requireAdmin } from '@/lib/auth';
import { EbookManager } from '@/features/admin/EbookManager';

export default async function AdminEbooksPage() {
  const session = await requireAdmin();
  return <EbookManager displayName={session.displayName} />;
}
