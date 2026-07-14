import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { progressStatuses } from '@/lib/gameCatalog';

type LookAndWritePayload = {
  title?: unknown;
  instruction?: unknown;
  word_bank?: unknown;
  items?: unknown;
};

type LookAndWriteItemPayload = {
  order?: unknown;
  image?: unknown;
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

function asLookAndWritePayload(value: unknown): LookAndWritePayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as LookAndWritePayload;
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
      const payload = item as LookAndWriteItemPayload;
      const order = Number(payload.order);
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        image: String(payload.image || '').trim(),
        answer: String(payload.answer || '').trim(),
      };
    })
    .filter((item): item is { order: number; image: string; answer: string } => item !== null)
    .sort((a, b) => a.order - b.order);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    const course = await findPlayableCourseGame(courseId, 'look_and_write');

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
          game: 'look_and_write',
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
            game: 'look_and_write',
          },
        },
        select: {
          statuses: true,
        },
      }),
    ]);

    const exercises = questions.map((question, index) => {
      const payload = asLookAndWritePayload(question.payload);
      const items = parseItems(payload.items);
      const wordBank = stringList(payload.word_bank);
      return {
        id: question.id,
        index,
        title: String(payload.title || '').trim() || `Bài ${index + 1}`,
        instruction:
          String(payload.instruction || '').trim() || 'Write the correct word under each picture.',
        word_bank: wordBank.length ? wordBank : items.map((item) => item.answer).filter(Boolean),
        items,
      };
    });

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
