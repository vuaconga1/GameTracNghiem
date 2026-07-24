import { SpeakingAdmin } from '@/features/admin/SpeakingAdmin';
import { requireAdmin } from '@/lib/auth';

export default async function AdminSpeakingPage() {
  const session = await requireAdmin();
  return <SpeakingAdmin displayName={session.displayName} />;
}
