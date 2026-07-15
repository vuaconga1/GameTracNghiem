import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { loadGamePlayerState } from '@/lib/loadGamePlayerState';

type ScramblePayload = {
  word?: unknown;
  hint?: unknown;
  image?: unknown;
};

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function asScramblePayload(value: unknown): ScramblePayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as ScramblePayload;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'scramble');

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
          game: 'scramble',
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
        game: 'scramble',
      }),
    ]);

    return NextResponse.json({
      success: true,
      course,
      questions: questions.map((question, index) => {
        const payload = asScramblePayload(question.payload);
        return {
          id: question.id,
          index,
          word: String(payload.word || '').trim(),
          hint: String(payload.hint || '').trim(),
          image: String(payload.image || '').trim(),
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
