import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { requireAdmin } from '@/lib/auth';
import { isCourseGameKey, parseCourseGameLessonRange } from '@/lib/courseGameLesson';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string; gameKey: string }> };

function invalidGameKeyResponse() {
  return Response.json({ success: false, message: 'Game không hợp lệ' }, { status: 400 });
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id, gameKey } = await params;
    if (!isCourseGameKey(gameKey)) return invalidGameKeyResponse();

    const course = await prisma.course.findFirst({
      where: { id, ...notArchived },
      select: { id: true, ebookFileId: true },
    });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }
    if (!course.ebookFileId) {
      return Response.json(
        { success: false, message: 'Khóa học chưa có sách đang hoạt động' },
        { status: 400 },
      );
    }

    const ebook = await prisma.ebook.findFirst({
      where: { id: course.ebookFileId, active: true, ...notArchived },
      select: { id: true, pageCount: true },
    });
    if (!ebook) {
      return Response.json(
        { success: false, message: 'Không tìm thấy sách đang hoạt động của khóa học' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const range = parseCourseGameLessonRange(body, ebook.pageCount);
    if (!range.ok) {
      return Response.json({ success: false, message: range.message }, { status: 400 });
    }

    const item = await prisma.courseGameLesson.upsert({
      where: { courseId_gameKey: { courseId: id, gameKey } },
      update: range.value,
      create: {
        courseId: id,
        gameKey,
        ...range.value,
      },
    });

    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id, gameKey } = await params;
    if (!isCourseGameKey(gameKey)) return invalidGameKeyResponse();

    const course = await prisma.course.findFirst({
      where: { id, ...notArchived },
      select: { id: true },
    });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    await prisma.courseGameLesson.deleteMany({
      where: { courseId: id, gameKey },
    });

    return Response.json({ success: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
