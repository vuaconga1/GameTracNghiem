import { NextResponse } from 'next/server';

import { loadHomeCourses } from '@/lib/loadHomeCourses';

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
    const { searchParams } = new URL(req.url);
    const levelName = String(searchParams.get('levelName') || '').trim();
    const data = await loadHomeCourses(levelName);

    return NextResponse.json({
      success: true,
      courses: data.courses,
      filters: data.filters,
      selectedLevelName: data.selectedLevelName,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
