import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    assertSpeakingMutationRequest(req);
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { note?: unknown };
    const revocationNote = String(body.note || '').trim().slice(0, 1000);
    if (!revocationNote) {
      return Response.json(
        { success: false, message: 'Bắt buộc nhập lý do thu hồi' },
        { status: 400 },
      );
    }

    const existing = await prisma.speakingEntitlement.findUnique({
      where: { id },
    });
    if (!existing) {
      return Response.json(
        { success: false, message: 'Không tìm thấy quyền Speaking' },
        { status: 404 },
      );
    }
    if (existing.status === 'REVOKED') {
      return Response.json({ success: true, entitlement: existing, alreadyRevoked: true });
    }

    const entitlement = await prisma.speakingEntitlement.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById: admin.userId,
        revocationNote,
      },
    });

    return Response.json({ success: true, entitlement, alreadyRevoked: false });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
