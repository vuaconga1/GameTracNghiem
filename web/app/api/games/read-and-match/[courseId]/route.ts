import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { progressStatuses } from '@/lib/gameCatalog';

type ReadAndMatchPayload = {
  title?: unknown;
  instruction?: unknown;
  items?: unknown;
};

type ReadAndMatchItemPayload = {
  order?: unknown;
  sentence?: unknown;
  image?: unknown;
  label?: unknown;
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

function asReadAndMatchPayload(value: unknown): ReadAndMatchPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as ReadAndMatchPayload;
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
      const payload = item as ReadAndMatchItemPayload;
      const order = Number(payload.order);
      const sentence = String(payload.sentence || '').trim();
      const answer = String(payload.answer || '').trim();
      const label = String(payload.label || '').trim();
      if (!sentence || !answer) return null;
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        sentence,
        image: String(payload.image || '').trim(),
        label: label || answer,
        answer,
      };
    })
    .filter(
      (
        item
      ): item is {
        order: number;
        sentence: string;
        image: string;
        label: string;
        answer: string;
      } => item !== null
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

    const course = await findPlayableCourseGame(courseId, 'read_and_match');

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
          game: 'read_and_match',
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
            game: 'read_and_match',
          },
        },
        select: {
          statuses: true,
        },
      }),
    ]);

    const exercises = questions
      .map((question, index) => {
        const payload = asReadAndMatchPayload(question.payload);
        const items = parseItems(payload.items);
        if (!items.length) return null;
        return {
          id: question.id,
          index,
          title: String(payload.title || '').trim() || `Bài ${index + 1}`,
          instruction:
            String(payload.instruction || '').trim() ||
            'Read each sentence and match it to the correct picture.',
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
          items: {
            order: number;
            sentence: string;
            image: string;
            label: string;
            answer: string;
          }[];
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
