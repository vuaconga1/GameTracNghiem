import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { makeEbookStorageKey, saveEbookFile } from '@/lib/ebookStorage';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.ebook.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy sách' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const title = form.get('title') !== null ? String(form.get('title') || '').trim() : undefined;
      const active =
        form.get('active') !== null ? String(form.get('active')) === 'true' : undefined;
      const pageCountRaw = form.get('pageCount');
      const pageCount =
        pageCountRaw !== null && String(pageCountRaw).trim() !== ''
          ? Number(pageCountRaw)
          : undefined;
      const file = form.get('file');

      let storageKey = existing.storageKey;
      let originalName = existing.originalName;
      if (file instanceof File && file.size > 0) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          return Response.json({ success: false, message: 'Chỉ chấp nhận file PDF' }, { status: 400 });
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        storageKey = makeEbookStorageKey(existing.id);
        await saveEbookFile(storageKey, bytes);
        originalName = file.name;
      }

      const item = await prisma.ebook.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(active !== undefined ? { active } : {}),
          ...(pageCount !== undefined && Number.isFinite(pageCount) ? { pageCount } : {}),
          storageKey,
          originalName,
        },
      });
      return Response.json({ success: true, item });
    }

    const body = await req.json();
    const item = await prisma.ebook.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: String(body.title || '').trim() } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
        ...(body.pageCount !== undefined
          ? {
              pageCount:
                body.pageCount === null || body.pageCount === ''
                  ? null
                  : Number(body.pageCount),
            }
          : {}),
      },
    });
    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.ebook.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy sách' }, { status: 404 });
    }

    const item = await prisma.ebook.update({
      where: { id },
      data: { archivedAt: new Date(), active: false },
    });

    // Keep file on disk so existing course links still resolve until remapped.

    return Response.json({
      success: true,
      item,
      message: 'Đã ẩn sách khỏi trang quản trị',
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
