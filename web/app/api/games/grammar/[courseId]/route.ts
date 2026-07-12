import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';

type ProgressStatus = 'empty' | 'correct' | 'wrong';

type GrammarPayload = {
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

function progressStatuses(value: unknown): ProgressStatus[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const status = String(item || 'empty').trim().toLowerCase();
    if (status === 'correct' || status === 'wrong') return status;
    return 'empty';
  });
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

    const course = await prisma.course.findFirst({
      where: { id: courseId, active: true },
      select: {
        id: true,
        name: true,
        levelName: true,
      },
    });

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
          game: 'grammar',
          active: true,
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
            game: 'grammar',
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
        const payload = asGrammarPayload(question.payload);
        return {
          id: question.id,
          index,
          prefix: String(payload.prefix || ''),
          suffix: String(payload.suffix || ''),
          hint: String(payload.hint || ''),
          answers: stringList(payload.answers),
        };
      }),
      statuses: progressStatuses(progress?.statuses),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
