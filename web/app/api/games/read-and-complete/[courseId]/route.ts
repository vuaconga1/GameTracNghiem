import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { progressStatuses } from '@/lib/gameCatalog';

type ReadAndCompletePayload = {
  title?: unknown;
  instruction?: unknown;
  word_bank?: unknown;
  items?: unknown;
};

type ReadAndCompleteItemPayload = {
  order?: unknown;
  sentence?: unknown;
  image?: unknown;
  hint_image?: unknown;
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

function asReadAndCompletePayload(value: unknown): ReadAndCompletePayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as ReadAndCompletePayload;
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
      const payload = item as ReadAndCompleteItemPayload;
      const order = Number(payload.order);
      const sentence = String(payload.sentence || '').trim();
      const answer = String(payload.answer || '').trim();
      if (!sentence || !answer) return null;
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        sentence,
        hint_image: String(payload.hint_image || payload.image || '').trim(),
        answer,
      };
    })
    .filter(
      (
        item
      ): item is { order: number; sentence: string; hint_image: string; answer: string } =>
        item !== null
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

    const course = await findPlayableCourseGame(courseId, 'read_and_complete');

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
          game: 'read_and_complete',
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
            game: 'read_and_complete',
          },
        },
        select: {
          statuses: true,
        },
      }),
    ]);

    const exercises = questions
      .map((question, index) => {
        const payload = asReadAndCompletePayload(question.payload);
        const items = parseItems(payload.items);
        if (!items.length) return null;
        const wordBank = stringList(payload.word_bank);
        return {
          id: question.id,
          index,
          title: String(payload.title || '').trim() || `Bài ${index + 1}`,
          instruction:
            String(payload.instruction || '').trim() ||
            'Read the sentences and complete the blanks.',
          word_bank: wordBank.length ? wordBank : items.map((item) => item.answer).filter(Boolean),
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
          word_bank: string[];
          items: { order: number; sentence: string; hint_image: string; answer: string }[];
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
