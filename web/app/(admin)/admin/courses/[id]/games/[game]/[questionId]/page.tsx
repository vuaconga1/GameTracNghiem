import { QuestionEditor } from '@/features/admin/QuestionEditor';
import { requireAdmin } from '@/lib/auth';

export default async function AdminEditQuestionPage({
  params,
}: {
  params: Promise<{ id: string; game: string; questionId: string }>;
}) {
  const session = await requireAdmin();
  const { id, game, questionId } = await params;
  return (
    <QuestionEditor
      displayName={session.displayName}
      courseId={id}
      game={game}
      questionId={questionId}
    />
  );
}
