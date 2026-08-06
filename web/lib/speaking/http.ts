import {
  SpeakingConflictError,
  SpeakingLimitError,
} from '@/lib/speaking/usage';
import { SpeakingAccessError } from '@/lib/speaking/access';
import { publicApiErrorMessage } from '@/lib/apiErrors';
import {
  DrillAttemptError,
  DrillProcessingError,
} from '@/lib/speaking/drillErrors';
import { SpeakingSecurityError } from '@/lib/speaking/security';
import { SessionEndSchedulerError } from '@/lib/speaking/sessionEndScheduler';

export function speakingErrorResponse(err: unknown) {
  if (err instanceof SpeakingSecurityError) {
    return Response.json(
      { success: false, code: err.code, message: err.message },
      {
        status: err.status,
        headers:
          err.status === 429
            ? { 'Retry-After': '60', 'Cache-Control': 'private, no-store' }
            : { 'Cache-Control': 'private, no-store' },
      },
    );
  }

  if (err instanceof SpeakingAccessError) {
    return Response.json(
      {
        success: false,
        code: err.code,
        message: err.message,
        access: err.access,
      },
      { status: err.status },
    );
  }

  if (err instanceof SpeakingLimitError || err instanceof SpeakingConflictError) {
    return Response.json(
      {
        success: false,
        code: err.code,
        message: err.message,
        ...err.details,
      },
      { status: err.status }
    );
  }

  if (err instanceof DrillAttemptError) {
    return Response.json(
      {
        success: false,
        code: err.code,
        message: err.message,
        counted: false,
        ...err.details,
      },
      { status: err.status },
    );
  }

  if (err instanceof DrillProcessingError) {
    return Response.json(
      {
        success: false,
        code: err.code,
        message: err.message,
        counted: false,
      },
      { status: err.status },
    );
  }

  if (err instanceof SessionEndSchedulerError) {
    return Response.json(
      {
        success: false,
        code: 'SESSION_END_SCHEDULER_NOT_READY',
        message:
          'AI Speaking chưa cấu hình đủ hệ thống dừng phiên (QStash). Liên hệ admin để bổ sung SPEAKING_SESSION_END_SCHEDULER / QSTASH_* trên Vercel.',
        detail: err.message,
      },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  return Response.json(
    { success: false, message: publicApiErrorMessage(err) },
    { status }
  );
}
