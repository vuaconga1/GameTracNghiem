import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { EBOOK_MAX_BYTES, usesBlobStorage } from '@/lib/ebookStorage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!usesBlobStorage()) {
      return Response.json(
        { success: false, message: 'Chưa cấu hình BLOB_READ_WRITE_TOKEN' },
        { status: 400 },
      );
    }
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        await requireAdmin();
        if (!pathname.startsWith('ebooks/') || !pathname.toLowerCase().endsWith('.pdf')) {
          throw new Error('Đường dẫn file không hợp lệ');
        }
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: EBOOK_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
