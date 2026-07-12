import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { getLeaderboard, parseLeaderboardPeriod } from '@/lib/leaderboard';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(req: Request) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const period = parseLeaderboardPeriod(searchParams.get('period'));
    const offset = Number(searchParams.get('offset')) || 0;

    const result = await getLeaderboard(period, offset);

    return NextResponse.json({
      success: true,
      players: result.players,
      period: result.period,
      label: result.label,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
