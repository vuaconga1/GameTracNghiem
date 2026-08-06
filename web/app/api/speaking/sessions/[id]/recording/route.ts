import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  evaluateSpeakingAccess,
  SPEAKING_ACCESS_REASON,
  SpeakingAccessError,
} from '@/lib/speaking/access';
import {
  isSpeakingActivityType,
  SPEAKING_RECORDING_RETENTION_DAYS,
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
} from '@/lib/speaking/config';
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
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

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
        kind: true,
        courseId: true,
        activityType: true,
      },
    });

    if (!session) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }
    if (session.userId !== auth.userId && auth.role !== 'admin') {
      return Response.json({ success: false, message: 'Không có quyền nghe bản ghi' }, { status: 403 });
    }
    if (auth.role !== 'admin') {
      if (!isSpeakingActivityType(session.activityType)) {
        return Response.json(
          { success: false, message: 'Activity của phiên không hợp lệ' },
          { status: 400 },
        );
      }
      const access = await evaluateSpeakingAccess({
        session: auth,
        courseId: session.courseId,
        activityType: session.activityType,
      });
      if (
        !access.allowed &&
        access.reason !== SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED
      ) {
        throw new SpeakingAccessError(access);
      }
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
    if (auth.role === 'admin') {
      await prisma.speakingRecordingAccessAudit.create({
        data: {
          sessionId: session.id,
          adminId: auth.userId,
          action: 'STREAM',
        },
      });
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
    assertSpeakingMutationRequest(req);
    const auth = await requireSession();
    const { id } = await params;

    const session = await prisma.speakingSession.findUnique({
      where: { id },
    });
    if (!session || session.userId !== auth.userId) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }
    const isAdminPreview =
      auth.role === 'admin' && session.kind === SPEAKING_SESSION_KIND.ADMIN_PREVIEW;
    if (!isAdminPreview) {
      if (!isSpeakingActivityType(session.activityType)) {
        return Response.json(
          { success: false, message: 'Activity của phiên không hợp lệ' },
          { status: 400 },
        );
      }
      const access = await evaluateSpeakingAccess({
        session: auth,
        courseId: session.courseId,
        activityType: session.activityType,
      });
      if (
        !access.allowed &&
        access.reason !== SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED
      ) {
        throw new SpeakingAccessError(access);
      }
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

      let driveFileId: string | null = null;
      let driveFileName: string | null = null;
      let driveWarning: string | null = null;

      if (isSpeakingDriveConfigured()) {
        try {
          const fileName = buildSpeakingDriveFileName({
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
          recordingDeleteAfter: new Date(
            Date.now() + SPEAKING_RECORDING_RETENTION_DAYS * 24 * 60 * 60 * 1000,
          ),
          recordingDeletedAt: null,
          recordingCleanupAttempts: 0,
          recordingCleanupLastAttemptAt: null,
          recordingCleanupLastError: null,
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
