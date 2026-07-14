import { QuestionListAdmin } from '@/features/admin/QuestionListAdmin';
import { requireAdmin } from '@/lib/auth';

export default async function AdminGameQuestionsPage({
  params,
}: {
  params: Promise<{ id: string; game: string }>;
}) {
  const session = await requireAdmin();
  const { id, game } = await params;
  return (
    <QuestionListAdmin displayName={session.displayName} courseId={id} game={game} />
  );
}
