import { hashPassword, requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.user.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    const nextRole = body.role !== undefined ? (body.role === 'admin' ? 'admin' : 'student') : undefined;

    if (nextRole === 'student' && existing.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin', ...notArchived },
      });
      if (adminCount <= 1) {
        return Response.json(
          { success: false, message: 'Không thể hạ cấp admin cuối cùng' },
          { status: 400 }
        );
      }
      if (existing.id === session.userId) {
        return Response.json(
          { success: false, message: 'Không thể tự hạ cấp chính mình' },
          { status: 400 }
        );
      }
    }

    const password = body.password !== undefined ? String(body.password || '').trim() : '';
    const item = await prisma.user.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined
          ? { displayName: String(body.displayName).trim() }
          : {}),
        ...(nextRole ? { role: nextRole } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });

    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const existing = await prisma.user.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy tài khoản' }, { status: 404 });
    }
    if (existing.id === session.userId) {
      return Response.json(
        { success: false, message: 'Không thể xóa chính tài khoản đang đăng nhập' },
        { status: 400 }
      );
    }
    if (existing.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin', ...notArchived },
      });
      if (adminCount <= 1) {
        return Response.json(
          { success: false, message: 'Không thể xóa admin cuối cùng' },
          { status: 400 }
        );
      }
    }

    const item = await prisma.user.update({
      where: { id },
      data: { archivedAt: new Date() },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });
    return Response.json({
      success: true,
      item,
      message: 'Đã ẩn tài khoản khỏi trang quản trị',
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
