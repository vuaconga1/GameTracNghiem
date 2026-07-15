import { requireSession } from '@/lib/auth';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { openEbookFile } from '@/lib/ebookStorage';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const ebook = await prisma.ebook.findFirst({
      where: { id, active: true, ...notArchived },
    });
    if (!ebook) {
      return Response.json({ success: false, message: 'Không tìm thấy sách' }, { status: 404 });
    }

    const file = await openEbookFile(ebook.storageKey);
    if (!file) {
      return Response.json(
        { success: false, message: 'File sách không tồn tại trên máy chủ' },
        { status: 404 },
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(ebook.originalName)}"`,
      'Cache-Control': 'private, max-age=300',
    };
    if (file.contentLength != null && Number.isFinite(file.contentLength)) {
      headers['Content-Length'] = String(file.contentLength);
    }

    const body =
      Buffer.isBuffer(file.body) ? new Uint8Array(file.body) : file.body;

    return new Response(body, { headers });
  } catch (err) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    return Response.json({ success: false, message }, { status });
  }
}
