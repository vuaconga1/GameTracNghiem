import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { loadGamePlayerState } from '@/lib/loadGamePlayerState';

type QuizPayload = {
  type?: unknown;
  typeLabel?: unknown;
  question?: unknown;
  answer?: unknown;
  fillMode?: unknown;
  accept?: unknown;
  options?: unknown;
};

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function asQuizPayload(value: unknown): QuizPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as QuizPayload;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function typeLabelFor(type: string, typeLabel: string): string {
  if (typeLabel) return typeLabel;
  if (type === 'word_form') return 'Word form';
  if (type === 'fill_blank') return 'Điền từ';
  return 'Chọn đáp án';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'quiz');

    if (!course) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy khóa học' },
        { status: 404 }
      );
    }

    const [questions, player] = await Promise.all([
      prisma.question.findMany({
        where: {
          courseId: course.id,
          game: 'quiz',
          active: true,
          archivedAt: null,
        },
        select: {
          id: true,
          payload: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      loadGamePlayerState({
        userId: session.userId,
        courseName: course.name,
        levelName: course.levelName,
        game: 'quiz',
      }),
    ]);

    return NextResponse.json({
      success: true,
      course,
      questions: questions.map((question, index) => {
        const payload = asQuizPayload(question.payload);
        const type = String(payload.type || 'multiple_choice').trim() || 'multiple_choice';
        const fillMode =
          payload.fillMode === true || type === 'fill_blank' || type === 'word_form';
        const answer = String(payload.answer || '').trim();
        const accept = stringList(payload.accept);
        return {
          id: question.id,
          index,
          type,
          typeLabel: typeLabelFor(type, String(payload.typeLabel || '').trim()),
          question: String(payload.question || ''),
          answer,
          fillMode,
          accept: accept.length ? accept : answer ? [answer] : [],
          options: stringList(payload.options),
        };
      }),
      statuses: player.statuses,
      playSessionId: player.playSessionId,
      gameScore: player.gameScore,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
