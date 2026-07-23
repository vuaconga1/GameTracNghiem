import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { requireAdmin } from '@/lib/auth';
import { courseBackgroundSrc, normalizeExternalImageUrl } from '@/lib/courseBackground';
import {
  deleteCourseBackground,
  isSupportedCourseBackground,
  MAX_COURSE_BACKGROUND_BYTES,
  saveCourseBackground,
} from '@/lib/courseBackgroundStorage';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

async function findCourse(id: string) {
  return prisma.course.findFirst({ where: { id, ...notArchived } });
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const course = await findCourse(id);
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return Response.json({ success: false, message: 'Vui lòng chọn ảnh' }, { status: 400 });
    }
    if (!isSupportedCourseBackground(file.name, file.type)) {
      return Response.json(
        { success: false, message: 'Chỉ chấp nhận ảnh PNG, JPG hoặc WebP' },
        { status: 400 }
      );
    }
    if (file.size > MAX_COURSE_BACKGROUND_BYTES) {
      return Response.json({ success: false, message: 'Ảnh tối đa 5MB' }, { status: 400 });
    }

    const savedKey = await saveCourseBackground(
      id,
      file.name,
      Buffer.from(await file.arrayBuffer()),
      file.type
    );
    const item = await prisma.course.update({
      where: { id },
      data: { backgroundImageKey: savedKey, backgroundImageUrl: null },
    });
    await deleteCourseBackground(course.backgroundImageKey);

    return Response.json({
      success: true,
      item,
      backgroundImageSrc: courseBackgroundSrc(item),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const course = await findCourse(id);
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const body = await req.json();
    const url = normalizeExternalImageUrl(body.url);
    if (!url) {
      return Response.json(
        { success: false, message: 'URL ảnh phải bắt đầu bằng http:// hoặc https://' },
        { status: 400 }
      );
    }

    const item = await prisma.course.update({
      where: { id },
      data: { backgroundImageUrl: url, backgroundImageKey: null },
    });
    await deleteCourseBackground(course.backgroundImageKey);

    return Response.json({
      success: true,
      item,
      backgroundImageSrc: courseBackgroundSrc(item),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const course = await findCourse(id);
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const item = await prisma.course.update({
      where: { id },
      data: { backgroundImageUrl: null, backgroundImageKey: null },
    });
    await deleteCourseBackground(course.backgroundImageKey);

    return Response.json({ success: true, item, backgroundImageSrc: null });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
