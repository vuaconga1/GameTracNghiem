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

  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  return Response.json(
    { success: false, message: publicApiErrorMessage(err) },
    { status }
  );
}
