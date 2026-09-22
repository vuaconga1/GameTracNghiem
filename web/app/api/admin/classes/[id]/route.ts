import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { requireClassAccess } from '@/lib/classAccess';
import { loadClassProgress } from '@/lib/loadClassProgress';
import { prisma } from '@/lib/db';
import { notArchived } from '@/lib/admin/notArchived';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id } = await params;
    const schoolClass = await requireClassAccess(session, id);

    const [members, assignments, progress] = await Promise.all([
      prisma.classMember.findMany({
        where: { classId: id, user: notArchived },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { user: { displayName: 'asc' } },
      }),
      prisma.classAssignment.findMany({
        where: { classId: id },
        orderBy: [{ deadlineAt: 'asc' }, { createdAt: 'asc' }],
      }),
      loadClassProgress(id),
    ]);

    return Response.json({
      success: true,
      item: {
        id: schoolClass.id,
        name: schoolClass.name,
        createdByUserId: schoolClass.createdByUserId,
        createdAt: schoolClass.createdAt.toISOString(),
        updatedAt: schoolClass.updatedAt.toISOString(),
        members: members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          displayName: m.user.displayName,
          username: m.user.username,
          role: m.user.role,
          joinedAt: m.createdAt.toISOString(),
        })),
        assignments: assignments.map((a) => ({
          id: a.id,
          courseId: a.courseId,
          gameKey: a.gameKey,
          skillId: a.skillId,
          levelName: a.levelName,
          courseName: a.courseName,
          gameLabel: a.gameLabel,
          skillLabel: a.skillLabel,
          deadlineAt: a.deadlineAt.toISOString(),
          createdAt: a.createdAt.toISOString(),
        })),
        progress,
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id } = await params;
    await requireClassAccess(session, id);
    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return Response.json(
        { success: false, message: 'Vui lòng nhập tên lớp' },
        { status: 400 }
      );
    }

    const item = await prisma.schoolClass.update({
      where: { id },
      data: { name },
    });

    return Response.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id } = await params;
    await requireClassAccess(session, id);
    await prisma.schoolClass.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
