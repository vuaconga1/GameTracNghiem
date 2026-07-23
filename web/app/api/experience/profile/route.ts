import { NextResponse } from 'next/server';

import { publicApiErrorMessage, requireSession } from '@/lib/auth';
import { getExperienceProfile } from '@/lib/playerExperience';

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

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await getExperienceProfile(session.userId);
    return NextResponse.json({ success: true, profile });
  } catch (err) {
    return errorResponse(err);
  }
}
