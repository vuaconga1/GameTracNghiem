import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

import { requireSession } from '@/lib/auth';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { ebookAbsolutePath } from '@/lib/ebookStorage';

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

    const filePath = ebookAbsolutePath(ebook.storageKey);
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      return Response.json({ success: false, message: 'File sách không tồn tại trên máy chủ' }, { status: 404 });
    }

    const stream = createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(ebook.originalName)}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    return Response.json({ success: false, message }, { status });
  }
}
