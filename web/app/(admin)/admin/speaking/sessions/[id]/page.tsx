import { SpeakingSessionDetail } from '@/features/admin/SpeakingSessionDetail';
import { requireAdmin } from '@/lib/auth';

export default async function AdminSpeakingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  return <SpeakingSessionDetail displayName={session.displayName} sessionId={id} />;
}
