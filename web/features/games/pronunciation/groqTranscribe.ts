/**
 * Server-side Groq Whisper transcription.
 * Uses OpenAI-compatible multipart endpoint (no SDK dependency).
 */

import { normalizeSpeechText, similarityPercent } from './scoreTranscript';

export type GroqTranscribeResult =
  | { ok: true; transcript: string }
  | { ok: false; fallback: true; reason: string };

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3-turbo';

/** Common Whisper inventions on silent / one-word clips — not real near-miss spellings. */
const GENERIC_HALLUCINATIONS = new Set([
  'alright',
  'all right',
  'allright',
  'okay',
  'ok',
  'thanks',
  'thank you',
  'thanks for watching',
  'thank you for watching',
  'bye',
  'you',
  'the',
  'subtitle',
  'subtitles',
  'music',
  'applause',
]);

export function buildWhisperPrompt(targetText: string): string {
  const target = String(targetText || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!target) return 'American or British English. One vocabulary word.';
  const wordCount = target.split(' ').filter(Boolean).length;
  if (wordCount <= 3) {
    return `American or British English pronunciation drill. Isolated spoken word: ${target}.`;
  }
  return `American or British English pronunciation drill. Isolated spoken sentence: ${target}`;
}

export function isGenericWhisperHallucination(transcript: string, targetText: string): boolean {
  const heard = normalizeSpeechText(transcript);
  const target = normalizeSpeechText(targetText);
  if (!heard || !target || heard === target) return false;
  if (!GENERIC_HALLUCINATIONS.has(heard)) return false;
  return similarityPercent(target, heard) < 55;
}

export async function transcribeWithGroq(
  audio: Blob,
  filename: string,
  apiKey = process.env.GROQ_API_KEY,
  prompt = ''
): Promise<GroqTranscribeResult> {
  if (!apiKey?.trim()) {
    return { ok: false, fallback: true, reason: 'missing_key' };
  }

  const form = new FormData();
  form.append('file', audio, filename || 'recording.webm');
  form.append('model', MODEL);
  form.append('language', 'en');
  form.append('temperature', '0');
  form.append('response_format', 'json');
  const whisperPrompt = prompt.trim();
  if (whisperPrompt) form.append('prompt', whisperPrompt);

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
