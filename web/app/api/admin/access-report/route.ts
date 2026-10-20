import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { previousVnWeekRange, vnWeekStartDate } from '@/lib/guestAccessWeek';
import { loadGradeAccessReport } from '@/lib/sendGradeAccessReport';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const raw = new URL(req.url).searchParams.get('week') || '';
    const weekStart = ISO_DATE.test(raw)
      ? vnWeekStartDate(new Date(`${raw}T12:00:00+07:00`))
      : previousVnWeekRange().start;
    const report = await loadGradeAccessReport(weekStart);
    return Response.json({ success: true, report });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
