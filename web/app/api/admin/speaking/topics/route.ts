import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_DURATION_SECONDS } from '@/lib/speaking/config';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId')?.trim();

    const topics = await prisma.speakingTopic.findMany({
      where: {
        archivedAt: null,
        ...(courseId ? { courseId } : {}),
      },
      orderBy: [{ courseId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        course: { select: { id: true, name: true, levelName: true } },
      },
    });

    return Response.json({ success: true, topics });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      courseId?: string;
      title?: string;
      instructions?: string;
      durationSeconds?: number;
      active?: boolean;
      sortOrder?: number;
    };

    const courseId = String(body.courseId || '').trim();
    const title = String(body.title || '').trim();
    const instructions = String(body.instructions || '').trim();
    if (!courseId || !title || !instructions) {
      return Response.json(
        { success: false, message: 'Thiếu courseId, title hoặc instructions' },
        { status: 400 }
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, archivedAt: null },
      select: { id: true },
    });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const durationSeconds =
      typeof body.durationSeconds === 'number' && body.durationSeconds > 0
        ? Math.min(Math.floor(body.durationSeconds), 1800)
        : DEFAULT_DURATION_SECONDS;

    const topic = await prisma.speakingTopic.create({
      data: {
        courseId,
        title,
        instructions,
        durationSeconds,
        active: body.active !== false,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      },
    });

    return Response.json({ success: true, topic });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
