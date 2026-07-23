import bcrypt from 'bcryptjs';
import { cache } from 'react';

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

export type SessionLookup = {
  session: SessionPayload | null;
  /** JWT present but user archived/missing in DB. */
  stale: boolean;
};

const lookupSession = cache(async (): Promise<SessionLookup> => {
  const session = await getSession();
  if (!session) {
    return { session: null, stale: false };
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
    return { session: null, stale: true };
  }

  return {
    session: {
      userId: user!.id,
      username: user!.username,
      displayName: user!.displayName,
      role: user!.role === 'admin' ? 'admin' : 'student',
    },
    stale: false,
  };
});

/** Read session for Server Components/layouts — never mutates cookies. */
export async function lookupSessionForPage(): Promise<SessionLookup> {
  return lookupSession();
}

export async function requireSession(): Promise<SessionPayload> {
  const { session, stale } = await lookupSession();
  if (session) return session;

  if (stale) {
    await clearSessionCookie();
    throw unauthorized('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');
  }

  throw unauthorized('Chưa đăng nhập');
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
