import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { requireClassAccess } from '@/lib/classAccess';
import { notArchived } from '@/lib/admin/notArchived';
import { isStudentAccountRole, normalizeUserRole } from '@/lib/userRoles';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id } = await params;
    await requireClassAccess(session, id);
    const body = await req.json();

    const userIds = Array.isArray(body.userIds)
      ? body.userIds.map((v: unknown) => String(v || '').trim()).filter(Boolean)
      : body.userId
        ? [String(body.userId).trim()]
        : [];

    if (!userIds.length) {
      return Response.json(
        { success: false, message: 'Vui lòng chọn học viên' },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, ...notArchived },
      select: { id: true, role: true, displayName: true, username: true },
    });

    if (users.length !== userIds.length) {
      return Response.json(
        { success: false, message: 'Một số học viên không tồn tại' },
        { status: 400 }
      );
    }

    const invalid = users.filter((u) => !isStudentAccountRole(normalizeUserRole(u.role)));
    if (invalid.length) {
      return Response.json(
        {
          success: false,
          message: 'Chỉ thêm tài khoản học sinh vào lớp',
        },
        { status: 400 }
      );
    }

    await prisma.classMember.createMany({
      data: users.map((u) => ({ classId: id, userId: u.id })),
      skipDuplicates: true,
    });

    const members = await prisma.classMember.findMany({
      where: { classId: id, userId: { in: userIds } },
      include: {
        user: {
          select: { id: true, displayName: true, username: true, role: true },
        },
      },
    });

    return Response.json({
      success: true,
      items: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        displayName: m.user.displayName,
        username: m.user.username,
        role: m.user.role,
        joinedAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id } = await params;
    await requireClassAccess(session, id);
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    if (!userId) {
      return Response.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    await prisma.classMember.deleteMany({
      where: { classId: id, userId },
    });

    return Response.json({ success: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
