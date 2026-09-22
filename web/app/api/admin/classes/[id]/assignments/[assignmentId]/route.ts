import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { requireClassAccess } from '@/lib/classAccess';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string; assignmentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id, assignmentId } = await params;
    await requireClassAccess(session, id);

    const existing = await prisma.classAssignment.findFirst({
      where: { id: assignmentId, classId: id },
      select: { id: true },
    });
    if (!existing) {
      return Response.json(
        { success: false, message: 'Không tìm thấy bài tập' },
        { status: 404 }
      );
    }

    await prisma.classAssignment.delete({ where: { id: assignmentId } });
    return Response.json({ success: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
