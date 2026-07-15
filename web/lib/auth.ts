import bcrypt from 'bcryptjs';

import { prisma } from './db';
import { clearSessionCookie, getSession, type SessionPayload, type UserRole } from './session';
import { isStaleSessionUser } from './sessionUser';

export { publicApiErrorMessage } from './apiErrors';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function unauthorized(message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = 401;
  return err;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw unauthorized('Chưa đăng nhập');
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
    throw unauthorized('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');
  }

  return {
    userId: user!.id,
    username: user!.username,
    displayName: user!.displayName,
    role: user!.role === 'admin' ? 'admin' : 'student',
  };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== 'admin') {
    const err = new Error('Không có quyền truy cập') as Error & { status: number };
    err.status = 403;
    throw err;
  }
  return session;
}

export function isAdminRole(role: string | null | undefined): role is UserRole {
  return role === 'admin';
}
