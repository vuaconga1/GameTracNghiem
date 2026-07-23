import { SignJWT, jwtVerify } from 'jose';

import { prisma } from './db';
import { hashPassword } from './auth';
import type { SessionPayload } from './session';

export const PORTAL_SSO_MAX_AGE_SEC = 180;

export type PortalSsoClaims = {
  sid: string;
  name: string;
  pwd: string;
};

function portalSsoSecretKey() {
  const secret = process.env.PORTAL_SSO_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('PORTAL_SSO_SECRET is missing or too short');
  }
  return new TextEncoder().encode(secret);
}

/** Issue a short-lived HS256 JWT (tests / internal tools). */
export async function sealPortalSsoToken(
  claims: PortalSsoClaims,
  maxAgeSec = PORTAL_SSO_MAX_AGE_SEC
): Promise<string> {
  const sid = claims.sid.trim();
  const pwd = claims.pwd.trim();
  const name = (claims.name || sid).trim() || sid;
  if (!sid || !pwd) {
    throw new Error('sid and pwd are required');
  }

  return new SignJWT({ sid, name, pwd })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(portalSsoSecretKey());
}

export async function verifyPortalSsoToken(token: string): Promise<PortalSsoClaims | null> {
  const raw = String(token || '').trim();
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, portalSsoSecretKey());
    const sid = typeof payload.sid === 'string' ? payload.sid.trim() : '';
    const pwd = typeof payload.pwd === 'string' ? payload.pwd.trim() : '';
    const nameRaw = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!sid || !pwd) return null;
    return { sid, name: nameRaw || sid, pwd };
  } catch {
    return null;
  }
}

/**
 * Find or create student by portal SID (= username).
 * Syncs displayName + password to match portal access code.
 * Refuses to touch admin accounts.
 */
export async function upsertPortalStudent(claims: PortalSsoClaims): Promise<SessionPayload> {
  const username = claims.sid.trim();
  const displayName = (claims.name || username).trim() || username;
  const password = claims.pwd.trim();
  if (!username || !password) {
    throw Object.assign(new Error('Token SSO thiếu sid hoặc pwd'), { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing?.role === 'admin') {
    throw Object.assign(new Error('Không thể đăng nhập SSO vào tài khoản quản trị'), {
      status: 403,
    });
  }
  if (existing?.archivedAt) {
    throw Object.assign(new Error('Tài khoản đã bị vô hiệu hóa'), { status: 403 });
  }

  const passwordHash = await hashPassword(password);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { displayName, passwordHash },
      })
    : await prisma.user.create({
        data: {
          username,
          displayName,
          passwordHash,
          role: 'student',
        },
      });

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: 'student',
  };
}
