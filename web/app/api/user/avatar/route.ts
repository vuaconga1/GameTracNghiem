import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { validateAvatarValue } from '@/lib/avatar';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();

    const body = (await req.json().catch(() => null)) as { avatar?: unknown } | null;
    const validation = validateAvatarValue(body?.avatar);
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: validation.value },
      select: { avatarUrl: true },
    });

    return NextResponse.json({ success: true, avatarUrl: user.avatarUrl });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true, avatarUrl: null });
  } catch (err) {
    return errorResponse(err);
  }
}
