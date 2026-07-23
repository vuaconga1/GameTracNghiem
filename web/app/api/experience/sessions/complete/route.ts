import { NextResponse } from 'next/server';

import { publicApiErrorMessage, requireSession } from '@/lib/auth';
import { completeExperienceSession } from '@/lib/playerExperience';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  return NextResponse.json(
    { success: false, message: publicApiErrorMessage(err) },
    { status },
  );
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const playSessionId = String(body.playSessionId || '').trim();

    if (!playSessionId) {
      return NextResponse.json(
        { success: false, message: 'playSessionId không hợp lệ' },
        { status: 400 },
      );
    }

    const result = await completeExperienceSession(session.userId, playSessionId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
