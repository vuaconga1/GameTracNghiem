import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

import { requireSession } from '@/lib/auth';
import { AUDIO_EXTS, IMAGE_EXTS, extensionOf } from '@/lib/media/normalizeMediaKey';
import { contentTypeForFileKey, mediaAbsolutePath } from '@/lib/mediaStorage';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ fileKey: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireSession();
    const { fileKey: rawKey } = await params;
    const fileKey = decodeURIComponent(rawKey);
    const ext = extensionOf(fileKey);

    if (!IMAGE_EXTS.has(ext) && !AUDIO_EXTS.has(ext)) {
      return Response.json({ success: false, message: 'Loại file không hỗ trợ' }, { status: 400 });
    }

    let filePath: string;
    try {
      filePath = mediaAbsolutePath(fileKey);
    } catch {
      return Response.json({ success: false, message: 'Media key không hợp lệ' }, { status: 400 });
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      return Response.json({ success: false, message: 'File media không tồn tại trên máy chủ' }, { status: 404 });
    }

    const stream = createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        'Content-Type': contentTypeForFileKey(fileKey),
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileKey)}"`,
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
