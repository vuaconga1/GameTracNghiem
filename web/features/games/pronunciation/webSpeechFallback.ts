type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isWebSpeechAvailable(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * One-shot English speech recognition (browser). Used when Groq is unavailable.
 */
export function recognizeWithWebSpeech(timeoutMs = 8000): Promise<string> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return Promise.reject(new Error('Trình duyệt không hỗ trợ nhận dạng giọng nói'));
  }

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      reject(new Error('Hết thời gian nhận dạng. Hãy thử lại.'));
    }, timeoutMs);

    recognition.onresult = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      resolve(String(transcript).trim());
    };

    recognition.onerror = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const code = event.error || 'unknown';
      reject(new Error(`Nhận dạng giọng nói thất bại (${code})`));
    };

    recognition.onend = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('Không nghe rõ. Hãy thử lại.'));
    };

    try {
      recognition.start();
    } catch (err) {
      settled = true;
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error('Không mở được nhận dạng giọng nói'));
    }
  });
}
