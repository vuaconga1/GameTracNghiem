import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { applyAttachToPayload, planMediaAttaches } from '@/lib/admin/attachMedia';
import { parseGamePayload } from '@/lib/admin/payloadSchemas';
import {
  makeMediaFileKey,
  maxBytesForKind,
  mediaPublicUrl,
  saveMediaFile,
} from '@/lib/mediaStorage';

export const runtime = 'nodejs';

function uploadBasename(filename: string): string {
  return filename.trim().replace(/^.*[\\/]/, '');
}

function formDataParseMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/formdata|multipart|boundary/i.test(msg)) {
    return 'Không đọc được file upload. Thử chọn ít ảnh hơn hoặc khởi động lại server sau khi cập nhật.';
  }
  return msg;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    let form: FormData;
    try {
      form = await req.formData();
    } catch (err) {
      return Response.json(
        { success: false, message: formDataParseMessage(err) },
        { status: 400 }
      );
    }
    const courseId = String(form.get('courseId') || '').trim();
    const game = String(form.get('game') || '').trim();
    const kindRaw = String(form.get('kind') || '').trim();
    const kind = kindRaw === 'audio' ? 'audio' : kindRaw === 'image' ? 'image' : null;
    if (!courseId || !game || !kind) {
      return Response.json(
        { success: false, message: 'Thiếu courseId, game hoặc kind' },
        { status: 400 }
      );
    }

    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    if (!files.length) {
      return Response.json({ success: false, message: 'Chưa chọn file' }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, ...notArchived },
    });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa' }, { status: 404 });
    }

    const questions = await prisma.question.findMany({
      where: { courseId, game, archivedAt: null },
      select: { id: true, payload: true },
    });

    const normalizedQuestions = questions.map((q) => ({
      id: q.id,
      payload: (q.payload && typeof q.payload === 'object'
        ? q.payload
        : {}) as Record<string, unknown>,
    }));

    const { actions } = planMediaAttaches({
      game,
      kind,
      questions: normalizedQuestions,
      filenames: files.map((f) => uploadBasename(f.name)),
    });

    const fileByName = new Map(files.map((f) => [uploadBasename(f.name), f]));
    const attached: Array<{
      questionId: string;
      key: string;
      url: string;
      filename: string;
    }> = [];
    const skippedFilled: Array<{ key: string; filename: string }> = [];
    const unmatched: Array<{ filename: string; reason: string }> = [];
    const errors: Array<{ filename: string; reason: string }> = [];

    for (const action of actions) {
      if (action.type === 'skipped_filled') {
        skippedFilled.push({ key: action.key, filename: action.filename });
        continue;
      }
      if (action.type === 'unmatched') {
        unmatched.push({ filename: action.filename, reason: action.reason });
        continue;
      }

      const file = fileByName.get(action.filename);
      if (!file) {
        errors.push({ filename: action.filename, reason: 'missing_file' });
        continue;
      }
      if (file.size > maxBytesForKind(kind)) {
        errors.push({ filename: action.filename, reason: 'too_large' });
        continue;
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const fileKey = makeMediaFileKey(action.filename);
      await saveMediaFile(fileKey, bytes);
      const url = mediaPublicUrl(fileKey);

      const q = normalizedQuestions.find((row) => row.id === action.questionId);
      if (!q) {
        errors.push({ filename: action.filename, reason: 'missing_question' });
        continue;
      }

      const nextPayload = applyAttachToPayload(
        q.payload,
        action.field,
        url,
        action.itemIndex
      );
      const parsed = parseGamePayload(game, nextPayload);
      await prisma.question.update({
        where: { id: action.questionId },
        data: { payload: parsed },
      });
      q.payload = nextPayload;
      attached.push({
        questionId: action.questionId,
        key: action.key,
        url,
        filename: action.filename,
      });
    }

    return Response.json({
      success: true,
      attached,
      skippedFilled,
      unmatched,
      errors,
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
