import { NextResponse } from 'next/server';

import { upsertPortalStudent, verifyPortalSsoTokenDetailed } from '@/lib/portalSso';
import { setSessionCookie } from '@/lib/session';
import { homeHrefForRole, normalizeUserRole } from '@/lib/userRoles';

function redirectTo(req: Request, pathname: string, error?: string) {
  const url = new URL(pathname, req.url);
  if (error) url.searchParams.set('sso_error', error);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token') || '';
    const verified = await verifyPortalSsoTokenDetailed(token);
    if (!verified.ok) {
      const error =
        verified.reason === 'expired'
          ? 'token_expired'
          : verified.reason === 'missing'
            ? 'invalid_token'
            : 'invalid_token';
      return redirectTo(req, '/login', error);
    }

    const session = await upsertPortalStudent(verified.claims);
    await setSessionCookie(session);
    return redirectTo(req, homeHrefForRole(normalizeUserRole(session.role)));
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 500;
    if (status === 403) {
      return redirectTo(req, '/login', 'forbidden');
    }
    return redirectTo(req, '/login', 'server_error');
  }
}
