import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  await clearSessionCookie();
  const next = req.nextUrl.searchParams.get('next') || '/login';
  return NextResponse.redirect(new URL(next, req.url));
}
