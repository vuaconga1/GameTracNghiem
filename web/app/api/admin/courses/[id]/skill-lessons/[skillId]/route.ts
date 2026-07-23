import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { requireAdmin } from '@/lib/auth';
import {
  isCourseSkillId,
  parseCourseSkillLessonRange,
} from '@/lib/courseSkillLesson';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string; skillId: string }> };

function invalidSkillIdResponse() {
  return Response.json({ success: false, message: 'Kỹ năng không hợp lệ' }, { status: 400 });
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id, skillId } = await params;
    if (!isCourseSkillId(skillId)) return invalidSkillIdResponse();

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
        { status: 400 }
      );
    }

    const ebook = await prisma.ebook.findFirst({
      where: { id: course.ebookFileId, active: true, ...notArchived },
      select: { id: true, pageCount: true },
    });
    if (!ebook) {
      return Response.json(
        { success: false, message: 'Không tìm thấy sách đang hoạt động của khóa học' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const range = parseCourseSkillLessonRange(body, ebook.pageCount);
    if (!range.ok) {
      return Response.json({ success: false, message: range.message }, { status: 400 });
    }

    const item = await prisma.courseSkillLesson.upsert({
      where: { courseId_skillId: { courseId: id, skillId } },
      update: range.value,
      create: {
        courseId: id,
        skillId,
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
    const { id, skillId } = await params;
    if (!isCourseSkillId(skillId)) return invalidSkillIdResponse();

    const course = await prisma.course.findFirst({
      where: { id, ...notArchived },
      select: { id: true },
    });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    await prisma.courseSkillLesson.deleteMany({
      where: { courseId: id, skillId },
    });

    return Response.json({ success: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
