import 'server-only';

import { getTtsSpeedByGrade } from '@/lib/tts/getTtsSpeedByGrade';

export type OpenAiSpeechInput = {
  text: string;
  /** School grade 1–9 — drives dynamic `speed`. */
  grade?: number | null;
  /** Explicit override; if omitted, derived from `grade`. */
  speed?: number;
  voice?: string;
  model?: string;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
};

export type OpenAiSpeechResult = {
  bytes: Buffer;
  contentType: string;
  speed: number;
};

/**
 * Call OpenAI TTS `/v1/audio/speech` with grade-aware speed.
 */
export async function synthesizeOpenAiSpeech(
  input: OpenAiSpeechInput
): Promise<OpenAiSpeechResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Thiếu OPENAI_API_KEY trên server');
  }

  const text = String(input.text || '').trim();
  if (!text) {
    throw new Error('Thiếu nội dung TTS');
  }

  const speed =
    typeof input.speed === 'number' && Number.isFinite(input.speed)
      ? clampSpeed(input.speed)
      : getTtsSpeedByGrade(Number(input.grade));

  const model = input.model || process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts';
  const voice = input.voice || process.env.OPENAI_TTS_VOICE?.trim() || 'coral';
  const format = input.format || 'mp3';

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      speed,
      response_format: format,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `OpenAI TTS lỗi ${response.status}: ${errText.slice(0, 400) || 'unknown'}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    contentType: contentTypeForFormat(format),
    speed,
  };
}

function clampSpeed(speed: number): number {
  return Math.min(4, Math.max(0.25, speed));
}

function contentTypeForFormat(format: OpenAiSpeechInput['format']): string {
  switch (format) {
    case 'opus':
      return 'audio/ogg';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    case 'wav':
      return 'audio/wav';
    case 'pcm':
      return 'application/octet-stream';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
}
