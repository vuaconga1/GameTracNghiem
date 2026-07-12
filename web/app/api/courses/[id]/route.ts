import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function progressStatuses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || 'empty'));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { id, active: true },
      select: {
        id: true,
        name: true,
        className: true,
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
    const [grammarQuestionCount, grammarProgress] = await Promise.all([
      prisma.question.count({
        where: {
          courseId: course.id,
          game: 'grammar',
          active: true,
        },
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
      course: {
        ...course,
        courseKey,
      },
      games: {
        grammar: {
          questionCount: grammarQuestionCount,
          statuses: progressStatuses(grammarProgress?.statuses),
        },
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
