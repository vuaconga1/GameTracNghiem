import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { loadVocabularyTestGame } from '@/lib/loadVocabularyTestGame';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;
    const data = await loadVocabularyTestGame(courseId, session.userId);
    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy khóa học' },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
