import {
  SpeakingConflictError,
  SpeakingLimitError,
} from '@/lib/speaking/usage';
import { publicApiErrorMessage } from '@/lib/apiErrors';

export function speakingErrorResponse(err: unknown) {
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

  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  return Response.json(
    { success: false, message: publicApiErrorMessage(err) },
    { status }
  );
}
