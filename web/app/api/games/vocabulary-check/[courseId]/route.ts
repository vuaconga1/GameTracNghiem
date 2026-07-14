import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { findPlayableCourseGame } from '@/lib/findPlayableCourseGame';
import { progressStatuses } from '@/lib/gameCatalog';

type VocabularyCheckPayload = {
  title?: unknown;
  instruction?: unknown;
  items?: unknown;
};

type VocabularyCheckItemPayload = {
  order?: unknown;
  image?: unknown;
  word?: unknown;
  sentence?: unknown;
  is_correct?: unknown;
};

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function asPayload(value: unknown): VocabularyCheckPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as VocabularyCheckPayload;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
      const payload = item as VocabularyCheckItemPayload;
      const order = Number(payload.order);
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        image: String(payload.image || '').trim(),
        word: String(payload.word || '').trim(),
        sentence: String(payload.sentence || '').trim(),
        is_correct: parseBoolean(payload.is_correct),
      };
    })
    .filter(
      (
        item
      ): item is {
        order: number;
        image: string;
        word: string;
        sentence: string;
        is_correct: boolean;
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

    const course = await findPlayableCourseGame(courseId, 'vocabulary_check');

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
          game: 'vocabulary_check',
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
            game: 'vocabulary_check',
          },
        },
        select: {
          statuses: true,
        },
      }),
    ]);

    const exercises = questions.map((question, index) => {
      const payload = asPayload(question.payload);
      const items = parseItems(payload.items);
      return {
        id: question.id,
        index,
        title: String(payload.title || '').trim() || `Bài ${index + 1}`,
        instruction:
          String(payload.instruction || '').trim() ||
          'Look at the picture and word. Is the sentence correct? Choose ✓ or ✗.',
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
