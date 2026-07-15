import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { loadGamePlayerState } from '@/lib/loadGamePlayerState';

type PronunciationPayload = {
  mode?: unknown;
  modeLabel?: unknown;
  prompt?: unknown;
  targetText?: unknown;
  targetIpa?: unknown;
  referenceAudioUrl?: unknown;
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

function asPronunciationPayload(value: unknown): PronunciationPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as PronunciationPayload;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'pronunciation');

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
          game: 'pronunciation',
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
        game: 'pronunciation',
      }),
    ]);

    return NextResponse.json({
      success: true,
      course,
      questions: questions.map((question, index) => {
        const payload = asPronunciationPayload(question.payload);
        const mode = String(payload.mode || 'phoneme').trim() || 'phoneme';
        return {
          id: question.id,
          index,
          mode,
          modeLabel: String(payload.modeLabel || '').trim(),
          prompt: String(payload.prompt || ''),
          targetText: String(payload.targetText || ''),
          targetIpa: String(payload.targetIpa || ''),
          referenceAudioUrl: String(payload.referenceAudioUrl || '').trim(),
          hint: String(payload.hint || '').trim(),
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
