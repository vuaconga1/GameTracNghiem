import { NextResponse } from 'next/server';

import { upsertPortalStudent, verifyPortalSsoToken } from '@/lib/portalSso';
import { setSessionCookie } from '@/lib/session';

function redirectTo(req: Request, pathname: string, error?: string) {
  const url = new URL(pathname, req.url);
  if (error) url.searchParams.set('sso_error', error);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token') || '';
    const claims = await verifyPortalSsoToken(token);
    if (!claims) {
      return redirectTo(req, '/login', 'invalid_token');
    }

    const session = await upsertPortalStudent(claims);
    await setSessionCookie(session);
    return redirectTo(req, '/');
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 500;
    if (status === 403) {
      return redirectTo(req, '/login', 'forbidden');
    }
    return redirectTo(req, '/login', 'server_error');
  }
}
