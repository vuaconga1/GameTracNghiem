import 'server-only';

import { OPENAI_REALTIME_MODEL } from '@/lib/speaking/config';
import { buildSpeakingRealtimeInstructions } from '@/lib/speaking/prompts';

export type RealtimeEphemeralResult = {
  clientSecret: string;
  expiresAt: number | null;
  model: string;
};

/**
 * Mint a short-lived Realtime client secret.
 * One-release rollback path for feature-flagged admin preview only.
 */
export async function createRealtimeClientSecret(input: {
  instructions: string;
  safetyIdentifier: string;
  model?: string;
  voice?: string;
  grade?: number | null;
  levelName?: string | null;
  topicTitle?: string | null;
}): Promise<RealtimeEphemeralResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Thiếu OPENAI_API_KEY trên server');
  }

  const model = input.model || process.env.OPENAI_REALTIME_MODEL?.trim() || OPENAI_REALTIME_MODEL;

  const body = {
    session: {
      type: 'realtime',
      model,
      instructions: buildSpeakingRealtimeInstructions({
        topicInstructions: input.instructions,
        topicTitle: input.topicTitle,
        grade: input.grade,
        levelName: input.levelName,
      }),
      audio: {
        input: {
          transcription: {
            model: 'gpt-4o-mini-transcribe',
            language: 'en',
          },
        },
        output: { voice: input.voice || 'marin' },
      },
    },
  };

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': input.safetyIdentifier.slice(0, 64),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: {
    value?: string;
    client_secret?: { value?: string; expires_at?: number };
    expires_at?: number;
    error?: { message?: string };
  } = {};
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    /* keep raw */
  }

  if (!response.ok) {
    throw new Error(
      `OpenAI client_secrets lỗi ${response.status}: ${
        data.error?.message || text.slice(0, 400) || 'unknown'
      }`
    );
  }

  const clientSecret = data.value || data.client_secret?.value || '';
  if (!clientSecret) {
    throw new Error('OpenAI không trả client secret');
  }

  return {
    clientSecret,
    expiresAt: data.expires_at ?? data.client_secret?.expires_at ?? null,
    model,
  };
}

export function extractRealtimeCallId(location: string | null) {
  if (!location) return null;
  try {
    const url = new URL(location, 'https://api.openai.com');
    const parts = url.pathname.split('/').filter(Boolean);
    const callId = parts.at(-1)?.trim() || null;
    return callId && callId !== 'calls' ? callId : null;
  } catch {
    return null;
  }
}

/** Unified backend SDP exchange; the master key and Location call ID stay server-side. */
export async function createRealtimeCall(input: {
  sdp: string;
  instructions: string;
  safetyIdentifier: string;
  model?: string;
  voice?: string;
  grade?: number | null;
  levelName?: string | null;
  topicTitle?: string | null;
}): Promise<{ sdpAnswer: string; callId: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Thiếu OPENAI_API_KEY trên server');
  }

  const model = input.model || process.env.OPENAI_REALTIME_MODEL?.trim() || OPENAI_REALTIME_MODEL;
  const sessionConfig = JSON.stringify({
    type: 'realtime',
    model,
    instructions: buildSpeakingRealtimeInstructions({
      topicInstructions: input.instructions,
      topicTitle: input.topicTitle,
      grade: input.grade,
      levelName: input.levelName,
    }),
    audio: {
      input: {
        transcription: {
          model: 'gpt-4o-mini-transcribe',
          language: 'en',
        },
      },
      output: { voice: input.voice || 'marin' },
    },
  });

  // Build multipart manually — Node FormData was truncating long browser SDPs (EOF).
  const boundary = `----wewinSpeaking${Date.now().toString(16)}`;
  const chunks = [
    `--${boundary}\r\nContent-Disposition: form-data; name="sdp"\r\nContent-Type: application/sdp\r\n\r\n`,
    input.sdp,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="session"\r\nContent-Type: application/json\r\n\r\n`,
    sessionConfig,
    `\r\n--${boundary}--\r\n`,
  ];
  const body = Buffer.concat(chunks.map((part) => Buffer.from(part, 'utf8')));

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Safety-Identifier': input.safetyIdentifier.slice(0, 64),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `OpenAI Realtime lỗi ${response.status}: ${text.slice(0, 400) || 'unknown'}`
    );
  }

  if (!text.includes('v=0')) {
    throw new Error('OpenAI Realtime không trả SDP answer');
  }

  // Location contains the Realtime call ID. x-request-id is only request
  // tracing metadata and cannot be used with /hangup.
  const callId = extractRealtimeCallId(response.headers.get('location'));
  if (!callId) {
    throw new Error('OpenAI Realtime không trả Location call ID');
  }

  return { sdpAnswer: text, callId, model };
}

/** Idempotent-enough hard stop: an already-ended/missing call is considered closed. */
export async function hangupRealtimeCall(callId: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Thiếu OPENAI_API_KEY trên server');
  }
  const normalizedCallId = callId.trim();
  if (!normalizedCallId) {
    throw new Error('Thiếu OpenAI Realtime call ID');
  }

  const response = await fetch(
    `https://api.openai.com/v1/realtime/calls/${encodeURIComponent(normalizedCallId)}/hangup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: '*/*',
      },
    },
  );
  if (response.ok || response.status === 404 || response.status === 409) {
    return { closed: true, status: response.status };
  }

  const text = await response.text();
  throw new Error(
    `OpenAI Realtime hangup lỗi ${response.status}: ${
      text.slice(0, 400) || 'unknown'
    }`,
  );
}
