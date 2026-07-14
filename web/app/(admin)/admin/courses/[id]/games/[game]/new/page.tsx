import { QuestionEditor } from '@/features/admin/QuestionEditor';
import { requireAdmin } from '@/lib/auth';

export default async function AdminNewQuestionPage({
  params,
}: {
  params: Promise<{ id: string; game: string }>;
}) {
  const session = await requireAdmin();
  const { id, game } = await params;
  return <QuestionEditor displayName={session.displayName} courseId={id} game={game} />;
}
