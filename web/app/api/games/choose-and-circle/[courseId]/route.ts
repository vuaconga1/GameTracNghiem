import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { progressStatuses } from '@/lib/gameCatalog';

type ChooseAndCirclePayload = {
  title?: unknown;
  instruction?: unknown;
  items?: unknown;
};

type ChooseAndCircleItemPayload = {
  order?: unknown;
  image?: unknown;
  options?: unknown;
  answer?: unknown;
};

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function asChooseAndCirclePayload(value: unknown): ChooseAndCirclePayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as ChooseAndCirclePayload;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
      const payload = item as ChooseAndCircleItemPayload;
      const order = Number(payload.order);
      const options = stringList(payload.options);
      const answer = String(payload.answer || '').trim();
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        image: String(payload.image || '').trim(),
        options: options.length >= 2 ? options : answer ? [answer, ...options].slice(0, 2) : options,
        answer,
      };
    })
    .filter(
      (item): item is { order: number; image: string; options: string[]; answer: string } =>
        item !== null && item.options.length >= 2 && Boolean(item.answer)
    )
    .sort((a, b) => a.order - b.order);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'choose_and_circle');

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
          game: 'choose_and_circle',
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
            game: 'choose_and_circle',
          },
        },
        select: {
          statuses: true,
        },
      }),
    ]);

    const exercises = questions
      .map((question, index) => {
        const payload = asChooseAndCirclePayload(question.payload);
        const items = parseItems(payload.items);
        if (!items.length) return null;
        return {
          id: question.id,
          index,
          title: String(payload.title || '').trim() || `Bài ${index + 1}`,
          instruction:
            String(payload.instruction || '').trim() ||
            'Look at the picture and circle the correct word.',
          items,
        };
      })
      .filter(
        (
          exercise
        ): exercise is {
          id: string;
          index: number;
          title: string;
          instruction: string;
          items: { order: number; image: string; options: string[]; answer: string }[];
        } => exercise !== null
      );

    const unitTotal = exercises.reduce((total, exercise) => total + exercise.items.length, 0);

    return NextResponse.json({
      success: true,
      course,
      exercises,
      unitTotal,
      statuses: progressStatuses(progress?.statuses),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
