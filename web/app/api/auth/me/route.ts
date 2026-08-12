import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { clearSessionCookie, getSession } from '@/lib/session';
import { isStaleSessionUser } from '@/lib/sessionUser';
import { homeHrefForRole, normalizeUserRole } from '@/lib/userRoles';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      archivedAt: true,
    },
  });

  if (isStaleSessionUser(user)) {
    await clearSessionCookie();
    return NextResponse.json(
      { loggedIn: false, message: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }

  const role = normalizeUserRole(user!.role);

  return NextResponse.json({
    loggedIn: true,
    username: user!.username,
    name: user!.displayName,
    role,
    homePath: homeHrefForRole(role),
  });
}
