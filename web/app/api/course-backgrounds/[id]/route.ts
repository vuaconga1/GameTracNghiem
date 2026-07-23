import { requireSession } from '@/lib/auth';
import { openCourseBackground } from '@/lib/courseBackgroundStorage';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { id, active: true, archivedAt: null },
      select: { backgroundImageKey: true },
    });
    if (!course?.backgroundImageKey) {
      return Response.json({ success: false, message: 'Ảnh không tồn tại' }, { status: 404 });
    }

    const image = await openCourseBackground(course.backgroundImageKey);
    if (!image) {
      return Response.json({ success: false, message: 'Ảnh không tồn tại' }, { status: 404 });
    }

    const body = Buffer.isBuffer(image.body) ? new Uint8Array(image.body) : image.body;
    return new Response(body, {
      headers: {
        'Content-Type': image.contentType,
        ...(image.contentLength ? { 'Content-Length': String(image.contentLength) } : {}),
        'Content-Disposition': 'inline',
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
