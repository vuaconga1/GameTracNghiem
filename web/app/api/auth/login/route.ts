import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập username và password' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, message: 'Sai username hoặc password' },
        { status: 401 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });

    return NextResponse.json({
      success: true,
      username: user.username,
      name: user.displayName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
