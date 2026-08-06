import 'server-only';

import { parseBuffer } from 'music-metadata';
import { z } from 'zod';

import {
  OPENAI_GUIDED_MODEL,
  OPENAI_TRANSCRIPTION_MODEL,
} from '@/lib/speaking/config';
import type { DrillLocale } from '@/lib/speaking/drillScoring';
import { DrillProcessingError } from '@/lib/speaking/drillErrors';
import {
  guidedAssessmentSchema,
  type GuidedAssessment,
  type GuidedDrillPayload,
} from '@/lib/speaking/drillSchemas';

export const MAX_DRILL_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_DRILL_AUDIO_DURATION_MS = 180_000;
export const MIN_DRILL_AUDIO_DURATION_MS = 300;

const OPENAI_URL = 'https://api.openai.com/v1';
const MIME_EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
};

function normalizedMimeType(value: string): string {
  return value.split(';', 1)[0].trim().toLocaleLowerCase('en');
}

function hasMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'audio/webm') {
    return (
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  }
  if (mimeType === 'audio/ogg') {
    return (
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53
    );
  }
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    );
  }
  if (mimeType === 'audio/mp4') {
    return (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    );
  }
  if (mimeType === 'audio/mpeg') {
    return (
      (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    );
  }
  return false;
}

export type ValidatedDrillAudio = {
  bytes: Uint8Array;
  mimeType: string;
  durationMs: number;
  fileName: string;
};

export type OpenAiUsageMetadata = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export async function parseDrillAudioDurationMs(input: {
  bytes: Uint8Array;
  mimeType: string;
}): Promise<number> {
  try {
    const metadata = await parseBuffer(
      input.bytes,
      {
        mimeType: normalizedMimeType(input.mimeType),
        size: input.bytes.byteLength,
      },
      { duration: true, skipCovers: true },
    );
    const durationSeconds = metadata.format.duration;
    if (!durationSeconds || !Number.isFinite(durationSeconds)) {
      throw new Error('duration unavailable');
    }
    return Math.round(durationSeconds * 1_000);
  } catch {
    throw new DrillProcessingError(
      'INVALID_AUDIO_DURATION',
      'The recording duration could not be verified by the server.',
      400,
    );
  }
}

export function validateDrillAudio(input: {
  bytes: Uint8Array;
  mimeType: string;
  durationMs: number;
  maxDurationMs?: number;
}): ValidatedDrillAudio {
  const mimeType = normalizedMimeType(input.mimeType);
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new DrillProcessingError(
      'UNSUPPORTED_AUDIO_TYPE',
      'This audio format is not supported.',
      400,
    );
  }
  if (
    input.bytes.byteLength < 12 ||
    input.bytes.byteLength > MAX_DRILL_AUDIO_BYTES
  ) {
    throw new DrillProcessingError(
      'INVALID_AUDIO_SIZE',
      'The recording is empty or too large.',
      400,
    );
  }
  const maxDurationMs = Math.min(
    MAX_DRILL_AUDIO_DURATION_MS,
    Math.max(MIN_DRILL_AUDIO_DURATION_MS, input.maxDurationMs ?? Infinity),
  );
  if (
    !Number.isFinite(input.durationMs) ||
    input.durationMs < MIN_DRILL_AUDIO_DURATION_MS ||
    input.durationMs > maxDurationMs
  ) {
    throw new DrillProcessingError(
      'INVALID_AUDIO_DURATION',
      'The recording duration is outside the allowed practice time.',
      400,
    );
  }
  if (!hasMagicBytes(input.bytes, mimeType)) {
    throw new DrillProcessingError(
      'AUDIO_SIGNATURE_MISMATCH',
      'The recording format could not be verified.',
      400,
    );
  }
  return {
    bytes: input.bytes,
    mimeType,
    durationMs: Math.round(input.durationMs),
    fileName: `speaking-drill.${extension}`,
  };
}

function apiKey(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) {
    throw new DrillProcessingError('OPENAI_NOT_CONFIGURED');
  }
  return value;
}

async function openAiFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${OPENAI_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new DrillProcessingError('OPENAI_UNAVAILABLE');
  }
}

const transcriptionResponseSchema = z
  .object({
    text: z.string().trim().min(1).max(5_000),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative().optional(),
        output_tokens: z.number().int().nonnegative().optional(),
        total_tokens: z.number().int().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export async function transcribeDrillAudio(
  audio: ValidatedDrillAudio,
): Promise<{
  transcript: string;
  model: string;
  usage: OpenAiUsageMetadata;
}> {
  const uploadBytes = new Uint8Array(audio.bytes.byteLength);
  uploadBytes.set(audio.bytes);
  try {
    const form = new FormData();
    form.set('model', OPENAI_TRANSCRIPTION_MODEL);
    form.set('language', 'en');
    form.set(
      'file',
      new File([uploadBytes.buffer], audio.fileName, { type: audio.mimeType }),
    );

    const response = await openAiFetch('/audio/transcriptions', {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      throw new DrillProcessingError('TRANSCRIPTION_FAILED');
    }
    const parsed = transcriptionResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success) {
      throw new DrillProcessingError('INVALID_TRANSCRIPTION');
    }
    return {
      transcript: parsed.data.text,
      model: OPENAI_TRANSCRIPTION_MODEL,
      usage: {
        inputTokens: parsed.data.usage?.input_tokens ?? 0,
        outputTokens: parsed.data.usage?.output_tokens ?? 0,
        totalTokens:
          parsed.data.usage?.total_tokens ??
          (parsed.data.usage?.input_tokens ?? 0) +
            (parsed.data.usage?.output_tokens ?? 0),
      },
    };
  } finally {
    uploadBytes.fill(0);
  }
}

export const GUIDED_ASSESSMENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    relevanceScore: { type: 'integer', minimum: 0, maximum: 100 },
    completenessScore: { type: 'integer', minimum: 0, maximum: 100 },
    languageScore: { type: 'integer', minimum: 0, maximum: 100 },
    praise: { type: 'string', minLength: 1, maxLength: 280 },
    improvement: { type: 'string', minLength: 1, maxLength: 280 },
  },
  required: [
    'score',
    'relevanceScore',
    'completenessScore',
    'languageScore',
    'praise',
    'improvement',
  ],
} as const;

const guidedResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({ content: z.string().min(1) })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
    usage: z
      .object({
        prompt_tokens: z.number().int().nonnegative().optional(),
        completion_tokens: z.number().int().nonnegative().optional(),
        total_tokens: z.number().int().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function guidedSystemPrompt(locale: DrillLocale): string {
  return [
    'You assess a short English guided-answer practice from a server transcript.',
    'Accept varied, simple answers when they answer the question; never require an exact sample phrase.',
    'Use accepted answers, sample answers, and keywords as flexible reference signals, not a rigid checklist.',
    'Score only relevance, answer completeness, and understandable language in the transcript.',
    'Never claim to assess phonemes, pronunciation, accent, voice quality, identity, or emotion.',
    'Return exactly one specific praise and one actionable improvement.',
    `Write praise and improvement in ${locale === 'vi' ? 'Vietnamese' : 'English'}.`,
  ].join(' ');
}

export async function scoreGuidedDrill(input: {
  payload: GuidedDrillPayload;
  transcript: string;
  locale: DrillLocale;
}): Promise<{
  assessment: GuidedAssessment;
  model: string;
  usage: OpenAiUsageMetadata;
}> {
  const reference = {
    question: input.payload.questionText,
    acceptedAnswers: input.payload.acceptedAnswers,
    sampleAnswers: input.payload.sampleAnswers,
    keywords: input.payload.keywords,
    hints: input.payload.hints,
    referenceText: input.payload.reference?.text ?? '',
    transcript: input.transcript,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await openAiFetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OPENAI_GUIDED_MODEL,
          temperature: 0,
          messages: [
            { role: 'system', content: guidedSystemPrompt(input.locale) },
            { role: 'user', content: JSON.stringify(reference) },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'guided_speaking_assessment',
              strict: true,
              schema: GUIDED_ASSESSMENT_JSON_SCHEMA,
            },
          },
        }),
      });
      if (!response.ok) throw new Error('guided request failed');
      const envelope = guidedResponseSchema.parse(
        await response.json().catch(() => null),
      );
      const assessment = guidedAssessmentSchema.parse(
        JSON.parse(envelope.choices[0].message.content),
      );
      const inputTokens = envelope.usage?.prompt_tokens ?? 0;
      const outputTokens = envelope.usage?.completion_tokens ?? 0;
      return {
        assessment,
        model: OPENAI_GUIDED_MODEL,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens:
            envelope.usage?.total_tokens ?? inputTokens + outputTokens,
        },
      };
    } catch {
      if (attempt === 1) {
        throw new DrillProcessingError('GUIDED_ASSESSMENT_FAILED');
      }
    }
  }

  throw new DrillProcessingError('GUIDED_ASSESSMENT_FAILED');
}
