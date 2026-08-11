import { NextResponse } from 'next/server';

import { hashPassword, requireSession, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

const MIN_PASSWORD_LENGTH = 4;

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const currentPassword = String(body.currentPassword || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' },
        { status: 400 },
      );
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
        },
        { status: 400 },
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true, archivedAt: true },
    });
    if (!user || user.archivedAt) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản không còn hiệu lực' },
        { status: 401 },
      );
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu hiện tại không đúng' },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true, message: 'Đã đổi mật khẩu' });
  } catch (err) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, message }, { status });
  }
}
