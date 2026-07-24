import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SPEAKING_SESSION_STATUS } from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import {
  openSpeakingRecording,
  saveSpeakingRecording,
  speakingRecordingPublicUrl,
} from '@/lib/speaking/recordingStorage';
import {
  buildSpeakingDriveFileName,
  isSpeakingDriveConfigured,
  uploadSpeakingRecordingToDrive,
} from '@/lib/speaking/driveUpload';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

function extFromMime(mime: string) {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  return 'webm';
}

/** Stream recording for session owner or admin (private Blob is not directly accessible). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireSession();
    const { id } = await params;

    const session = await prisma.speakingSession.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        recordingKey: true,
        recordingUrl: true,
        recordingMimeType: true,
      },
    });

    if (!session) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }
    if (session.userId !== auth.userId && auth.role !== 'admin') {
      return Response.json({ success: false, message: 'Không có quyền nghe bản ghi' }, { status: 403 });
    }

    const storageKey = session.recordingKey || session.recordingUrl;
    if (!storageKey) {
      return Response.json({ success: false, message: 'Phiên chưa có bản ghi' }, { status: 404 });
    }

    const file = await openSpeakingRecording(storageKey);
    if (!file) {
      return Response.json(
        { success: false, message: 'Không tìm thấy file bản ghi trên máy chủ' },
        { status: 404 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': session.recordingMimeType || 'audio/webm',
      'Content-Disposition': `inline; filename="speaking-${session.id}.webm"`,
      'Cache-Control': 'private, max-age=300',
    };
    if (file.contentLength != null && Number.isFinite(file.contentLength)) {
      headers['Content-Length'] = String(file.contentLength);
    }

    const body = Buffer.isBuffer(file.body) ? new Uint8Array(file.body) : file.body;
    return new Response(body, { headers });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const auth = await requireSession();
    const { id } = await params;

    const session = await prisma.speakingSession.findUnique({ where: { id } });
    if (!session || session.userId !== auth.userId) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }

    const allowed = new Set<string>([
      SPEAKING_SESSION_STATUS.ACTIVE,
      SPEAKING_SESSION_STATUS.FINISHING,
      SPEAKING_SESSION_STATUS.UPLOADING,
      SPEAKING_SESSION_STATUS.UPLOAD_FAILED,
      SPEAKING_SESSION_STATUS.SUBMITTED,
    ]);
    if (!allowed.has(session.status)) {
      return Response.json(
        { success: false, message: 'Phiên chưa đủ điều kiện upload recording' },
        { status: 409 }
      );
    }

    await prisma.speakingSession.update({
      where: { id: session.id },
      data: { status: SPEAKING_SESSION_STATUS.UPLOADING },
    });

    const form = await req.formData();
    const file = form.get('file') || form.get('recording');
    if (!(file instanceof File) || file.size === 0) {
      await prisma.speakingSession.update({
        where: { id: session.id },
        data: {
          status: SPEAKING_SESSION_STATUS.UPLOAD_FAILED,
          errorMessage: 'Thiếu file recording',
        },
      });
      return Response.json({ success: false, message: 'Thiếu file recording' }, { status: 400 });
    }

    const mimeType = file.type || 'audio/webm';
    const bytes = Buffer.from(await file.arrayBuffer());

    try {
      const saved = await saveSpeakingRecording({
        sessionId: session.id,
        bytes,
        mimeType,
        ext: extFromMime(mimeType),
      });

      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { username: true, displayName: true },
      });

      let driveFileId: string | null = null;
      let driveFileName: string | null = null;
      let driveWarning: string | null = null;

      if (isSpeakingDriveConfigured()) {
        try {
          const fileName = buildSpeakingDriveFileName({
            username: user?.username || auth.username,
            displayName: user?.displayName || auth.displayName,
            sessionId: session.id,
            ext: extFromMime(mimeType),
          });
          const drive = await uploadSpeakingRecordingToDrive({
            bytes,
            mimeType,
            fileName,
          });
          driveFileId = drive.fileId;
          driveFileName = drive.fileName;
        } catch (driveErr) {
          driveWarning =
            driveErr instanceof Error
              ? driveErr.message
              : 'Upload Google Drive thất bại';
          console.error('[speaking] drive upload failed', driveErr);
        }
      }

      const updated = await prisma.speakingSession.update({
        where: { id: session.id },
        data: {
          status: SPEAKING_SESSION_STATUS.SUBMITTED,
          recordingUrl: speakingRecordingPublicUrl(session.id),
          recordingKey: saved.key,
          recordingMimeType: mimeType,
          recordingBytes: saved.bytes,
          driveFileId,
          driveFileName,
          errorMessage: null,
        },
      });

      return Response.json({
        success: true,
        session: {
          id: updated.id,
          status: updated.status,
          recordingUrl: updated.recordingUrl,
          recordingBytes: updated.recordingBytes,
          driveFileId: updated.driveFileId,
          driveFileName: updated.driveFileName,
        },
        driveWarning,
      });
    } catch (uploadErr) {
      const message =
        uploadErr instanceof Error ? uploadErr.message : 'Upload recording thất bại';
      await prisma.speakingSession.update({
        where: { id: session.id },
        data: {
          status: SPEAKING_SESSION_STATUS.UPLOAD_FAILED,
          errorMessage: message,
        },
      });
      return Response.json({ success: false, message }, { status: 500 });
    }
  } catch (err) {
    return speakingErrorResponse(err);
  }
}
