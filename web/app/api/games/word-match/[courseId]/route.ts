import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { progressStatuses } from '@/lib/gameCatalog';

type WordMatchPayload = {
  word?: unknown;
  image?: unknown;
  hint?: unknown;
};

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function asWordMatchPayload(value: unknown): WordMatchPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as WordMatchPayload;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'word_match');

    if (!course) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy khóa học' },
        { status: 404 }
      );
    }

    const courseKey = progressCourseKey(course.name, course.levelName);
    const [questions, progress] = await Promise.all([
      prisma.question.findMany({
        where: {
          courseId: course.id,
          game: 'word_match',
          active: true,
          archivedAt: null,
        },
        select: {
          id: true,
          payload: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      prisma.gameProgress.findUnique({
        where: {
          userId_courseKey_game: {
            userId: session.userId,
            courseKey,
            game: 'word_match',
          },
        },
        select: {
          statuses: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      course,
      questions: questions.map((question, index) => {
        const payload = asWordMatchPayload(question.payload);
        return {
          id: question.id,
          index,
          word: String(payload.word || '').trim(),
          image: String(payload.image || '').trim(),
          hint: String(payload.hint || '').trim(),
        };
      }),
      statuses: progressStatuses(progress?.statuses),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
