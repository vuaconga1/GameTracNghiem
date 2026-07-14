import { hashPassword, requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const items = await prisma.user.findMany({
      where: notArchived,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
    });
    return Response.json({ success: true, items });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const displayName = String(body.displayName || '').trim();
    const role = body.role === 'admin' ? 'admin' : 'student';

    if (!username || !password || !displayName) {
      return Response.json(
        { success: false, message: 'Vui lòng nhập username, mật khẩu và tên hiển thị' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing?.archivedAt) {
      const passwordHash = await hashPassword(password);
      const item = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          displayName,
          role,
          archivedAt: null,
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
    }

    const passwordHash = await hashPassword(password);
    const item = await prisma.user.create({
      data: { username, passwordHash, displayName, role },
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
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return Response.json({ success: false, message: 'Username đã tồn tại' }, { status: 400 });
    }
    return adminErrorResponse(err);
  }
}
