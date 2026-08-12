import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import { SESSION_COOKIE } from '@/lib/session';
import { normalizeUserRole, type UserRole } from '@/lib/userRoles';

export async function readSessionRoleFromRequest(req: NextRequest): Promise<UserRole | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return normalizeUserRole(payload.role);
  } catch {
    return null;
  }
}
