/**
 * Server-side Groq Whisper transcription.
 * Uses OpenAI-compatible multipart endpoint (no SDK dependency).
 */

export type GroqTranscribeResult =
  | { ok: true; transcript: string }
  | { ok: false; fallback: true; reason: string };

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3-turbo';

export async function transcribeWithGroq(
  audio: Blob,
  filename: string,
  apiKey = process.env.GROQ_API_KEY
): Promise<GroqTranscribeResult> {
  if (!apiKey?.trim()) {
    return { ok: false, fallback: true, reason: 'missing_key' };
  }

  const form = new FormData();
  form.append('file', audio, filename || 'recording.webm');
  form.append('model', MODEL);
  form.append('language', 'en');
  form.append('response_format', 'json');

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: form,
    });
  } catch {
    return { ok: false, fallback: true, reason: 'network' };
  }

  if (response.status === 429) {
    return { ok: false, fallback: true, reason: 'rate_limit' };
  }

  if (!response.ok) {
    return { ok: false, fallback: true, reason: `http_${response.status}` };
  }

  const json = (await response.json()) as { text?: string };
  const transcript = String(json.text || '').trim();
  if (!transcript) {
    return { ok: false, fallback: true, reason: 'empty_transcript' };
  }

  return { ok: true, transcript };
}
