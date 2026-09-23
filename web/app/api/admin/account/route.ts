import {
  hashPassword,
  requireAdminOrTeacher,
  verifyPassword,
} from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';

/** Matches admin user create: non-empty password is enough. */
const MIN_PASSWORD_LENGTH = 1;

export async function PATCH(req: Request) {
  try {
    const session = await requireAdminOrTeacher();
    const body = await req.json();

    const currentPassword = String(body.currentPassword || '');
    const newUsernameRaw =
      body.newUsername !== undefined ? String(body.newUsername || '').trim() : '';
    const newPassword =
      body.newPassword !== undefined ? String(body.newPassword || '') : '';
    const confirmPassword =
      body.confirmPassword !== undefined ? String(body.confirmPassword || '') : '';

    if (!currentPassword) {
      return Response.json(
        { success: false, message: 'Vui lòng nhập mật khẩu hiện tại' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: session.userId, ...notArchived },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        passwordHash: true,
      },
    });
    if (!user) {
      return Response.json(
        { success: false, message: 'Không tìm thấy tài khoản' },
        { status: 404 }
      );
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return Response.json(
        { success: false, message: 'Mật khẩu hiện tại không đúng' },
        { status: 401 }
      );
    }

    const usernameChanged =
      Boolean(newUsernameRaw) && newUsernameRaw !== user.username;
    const passwordChanged = Boolean(newPassword);

    if (!usernameChanged && !passwordChanged) {
      return Response.json(
        {
          success: false,
          message: 'Nhập username mới và/hoặc mật khẩu mới để cập nhật',
        },
        { status: 400 }
      );
    }

    if (usernameChanged) {
      const taken = await prisma.user.findUnique({
        where: { username: newUsernameRaw },
        select: { id: true },
      });
      if (taken && taken.id !== user.id) {
        return Response.json(
          { success: false, message: 'Username đã được người khác sử dụng' },
          { status: 400 }
        );
      }
    }

    if (passwordChanged) {
      if (newPassword.trim().length < MIN_PASSWORD_LENGTH) {
        return Response.json(
          { success: false, message: 'Mật khẩu mới không được để trống' },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return Response.json(
          { success: false, message: 'Xác nhận mật khẩu mới không khớp' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(usernameChanged ? { username: newUsernameRaw } : {}),
        ...(passwordChanged ? { passwordHash: await hashPassword(newPassword) } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
      },
    });

    if (usernameChanged) {
      await setSessionCookie({
        userId: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        role: session.role,
      });
    }

    return Response.json({
      success: true,
      item: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        role: updated.role,
      },
      message: usernameChanged
        ? passwordChanged
          ? 'Đã đổi username và mật khẩu'
          : 'Đã đổi username'
        : 'Đã đổi mật khẩu',
    });
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return Response.json(
        { success: false, message: 'Username đã được người khác sử dụng' },
        { status: 400 }
      );
    }
    return adminErrorResponse(err);
  }
}
