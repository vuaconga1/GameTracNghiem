import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { makeEbookStorageKey, saveEbookFile } from '@/lib/ebookStorage';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin();
    const items = await prisma.ebook.findMany({
      where: notArchived,
      orderBy: [{ title: 'asc' }],
    });
    return Response.json({ success: true, items });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const title = String(form.get('title') || '').trim();
    const file = form.get('file');

    if (!title) {
      return Response.json({ success: false, message: 'Vui lòng nhập tên sách' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ success: false, message: 'Vui lòng chọn file PDF' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return Response.json({ success: false, message: 'Chỉ chấp nhận file PDF' }, { status: 400 });
    }
    if (file.size > 80 * 1024 * 1024) {
      return Response.json({ success: false, message: 'File tối đa 80MB' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const item = await prisma.ebook.create({
      data: {
        title,
        originalName: file.name,
        storageKey: 'pending.pdf',
      },
    });

    const storageKey = makeEbookStorageKey(item.id);
    await saveEbookFile(storageKey, bytes);
    const saved = await prisma.ebook.update({
      where: { id: item.id },
      data: { storageKey },
    });

    return Response.json({ success: true, item: saved });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
