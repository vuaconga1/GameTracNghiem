import { NextResponse } from 'next/server';

import { getParentWeeklyScore } from '@/lib/parentWeeklyScores';
import { parseIsoWeekKey } from '@/lib/leaderboardPeriod';
import { verifyPortalSsoToken } from '@/lib/portalSso';

const PARENT_PORTAL_ORIGINS = ['https://wewin.baobai.edu.vn'];

function allowedOrigin(origin: string | null): string | null {
  if (origin && PARENT_PORTAL_ORIGINS.includes(origin)) return origin;
  return null;
}

function corsHeaders(req: Request): HeadersInit {
  const origin = allowedOrigin(req.headers.get('origin'));
  return {
    'Access-Control-Allow-Origin': origin || PARENT_PORTAL_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

function readBearerToken(req: Request): string {
  const header = req.headers.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function parseWeekParams(searchParams: URLSearchParams) {
  const fromKey = parseIsoWeekKey(searchParams.get('weekKey'));
  if (fromKey) return fromKey;

  const yearRaw = searchParams.get('year');
  const weekRaw = searchParams.get('week');
  if (yearRaw && weekRaw) {
    return parseIsoWeekKey(`${yearRaw}-W${weekRaw}`);
  }
  return null;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: Request) {
  try {
    const token = readBearerToken(req);
    const claims = token ? await verifyPortalSsoToken(token) : null;
    if (!claims) {
      return json(
        req,
        { ok: false, message: 'Phiên đăng nhập game không hợp lệ hoặc đã hết hạn.' },
        401
      );
    }

    const { searchParams } = new URL(req.url);
    const week = parseWeekParams(searchParams);
    if (!week) {
      return json(req, { ok: false, message: 'Thiếu hoặc sai tuần (weekKey=YYYY-Www).' }, 400);
    }

    const requestedId = String(searchParams.get('studentId') || '').trim();
    if (requestedId && requestedId.toUpperCase() !== claims.sid.trim().toUpperCase()) {
      return json(req, { ok: false, message: 'Mã học viên không khớp phiên đăng nhập.' }, 403);
    }

    const result = await getParentWeeklyScore({
      studentId: claims.sid,
      weekYear: week.weekYear,
      isoWeek: week.isoWeek,
    });

    if (!result.ok) {
      return json(req, { ok: false, message: result.message }, result.status);
    }

    return json(req, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    const missingSecret = /PORTAL_SSO_SECRET/i.test(message);
    return json(
      req,
      {
        ok: false,
        message: missingSecret
          ? 'Chưa cấu hình SSO điểm tuần trên game trắc nghiệm.'
          : 'Không tải được điểm tuần.',
      },
      missingSecret ? 503 : 500
    );
  }
}
