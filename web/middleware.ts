import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import { isLogisticsLevel } from '@/lib/logisticsUnits';

const SESSION_COOKIE = 'wewin_session';

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export function isPublicPlayerPage(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/logistics' ||
    pathname.startsWith('/logistics/') ||
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname === '/games' ||
    pathname.startsWith('/games/') ||
    /^\/speaking\/[^/]+\/?$/.test(pathname)
  );
}

/** Static files from `/public` must stay reachable for guest players (course thumbs, logo, game art). */
export function isPublicStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/images/')) return true;
  if (pathname.startsWith('/fonts/')) return true;
  return /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp3|wav)$/i.test(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/' && isLogisticsLevel(req.nextUrl.searchParams.get('levelName'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/logistics';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/portal-sso') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    isPublicStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    // API routes enforce auth themselves where needed
    return NextResponse.next();
  }

  if (isPublicPlayerPage(pathname)) {
    return NextResponse.next();
  }

  if (!(await hasValidSession(req))) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images/).*)'],
};
