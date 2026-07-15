export type RecordedClip = {
  blob: Blob;
  mimeType: string;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

/**
 * Start mic capture. Await `done` for the clip (ends on `stop()` or maxMs).
 */
export async function startMicRecording(maxMs = 8000): Promise<{
  stop: () => void;
  cancel: () => void;
  done: Promise<RecordedClip>;
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ ghi âm');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  let settle: ((clip: RecordedClip) => void) | null = null;
  let fail: ((err: Error) => void) | null = null;
  let closed = false;

  const cleanup = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  const done = new Promise<RecordedClip>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  recorder.onerror = () => {
    if (closed) return;
    closed = true;
    clearTimeout(maxTimer);
    cleanup();
    fail?.(new Error('Không ghi được âm thanh'));
  };

  recorder.onstop = () => {
    if (closed) return;
    closed = true;
    clearTimeout(maxTimer);
    cleanup();
    const type = recorder.mimeType || mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type });
    if (!blob.size) {
      fail?.(new Error('Không thu được âm thanh. Thử nói to hơn nhé.'));
      return;
    }
    settle?.({ blob, mimeType: type });
  };

  recorder.start();

  const maxTimer = setTimeout(() => {
    if (!closed && recorder.state === 'recording') {
      recorder.stop();
    }
  }, maxMs);

  return {
    stop: () => {
      if (!closed && recorder.state === 'recording') {
        recorder.stop();
      }
    },
    cancel: () => {
      clearTimeout(maxTimer);
      if (closed) return;
      closed = true;
      cleanup();
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      fail?.(new Error('Đã hủy ghi âm'));
    },
    done,
  };
}
