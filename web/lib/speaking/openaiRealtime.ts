import 'server-only';

import { OPENAI_REALTIME_MODEL } from '@/lib/speaking/config';

export type RealtimeEphemeralResult = {
  clientSecret: string;
  expiresAt: number | null;
  model: string;
};

/**
 * Mint a short-lived Realtime client secret.
 * Browser uses it to POST SDP directly to OpenAI (API key never leaves the server).
 */
export async function createRealtimeClientSecret(input: {
  instructions: string;
  safetyIdentifier: string;
  model?: string;
  voice?: string;
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
      instructions: [
        input.instructions,
        '',
        'The student practices spoken English only. Reply in clear, simple English.',
        'Ignore non-English filler noise; keep the conversation in English.',
      ].join('\n'),
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

/** @deprecated Prefer ephemeral client secret + browser SDP exchange. */
export async function createRealtimeCall(input: {
  sdp: string;
  instructions: string;
  safetyIdentifier: string;
  model?: string;
  voice?: string;
}): Promise<{ sdpAnswer: string; callId: string | null }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Thiếu OPENAI_API_KEY trên server');
  }

  const model = input.model || process.env.OPENAI_REALTIME_MODEL?.trim() || OPENAI_REALTIME_MODEL;
  const sessionConfig = JSON.stringify({
    type: 'realtime',
    model,
    instructions: [
      input.instructions,
      '',
      'The student practices spoken English only. Reply in clear, simple English.',
    ].join('\n'),
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

  const callId =
    response.headers.get('x-request-id') ||
    response.headers.get('location')?.split('/').pop() ||
    null;

  return { sdpAnswer: text, callId };
}
