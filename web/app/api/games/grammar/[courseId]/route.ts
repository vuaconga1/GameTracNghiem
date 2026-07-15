import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { loadGamePlayerState } from '@/lib/loadGamePlayerState';

type GrammarPayload = {
  source?: unknown;
  prefix?: unknown;
  suffix?: unknown;
  hint?: unknown;
  answers?: unknown;
};

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function asGrammarPayload(value: unknown): GrammarPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as GrammarPayload;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'grammar');

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
          game: 'grammar',
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
        game: 'grammar',
      }),
    ]);

    return NextResponse.json({
      success: true,
      course,
      questions: questions.map((question, index) => {
        const payload = asGrammarPayload(question.payload);
        return {
          id: question.id,
          index,
          source: String(payload.source || ''),
          prefix: String(payload.prefix || ''),
          suffix: String(payload.suffix || ''),
          hint: String(payload.hint || ''),
          answers: stringList(payload.answers),
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
