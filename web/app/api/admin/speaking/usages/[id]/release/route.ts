import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { releaseDailyUsage } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const reason = String(body.reason || '').trim();
    if (!reason) {
      return Response.json(
        { success: false, message: 'Bắt buộc nhập lý do hoàn lượt' },
        { status: 400 }
      );
    }

    const result = await releaseDailyUsage({
      usageId: id,
      adminId: admin.userId,
      reason,
    });

    return Response.json({
      success: true,
      usage: result.usage,
      sessionId: result.sessionId,
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
