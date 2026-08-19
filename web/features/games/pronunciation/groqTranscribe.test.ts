import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  buildWhisperPrompt,
  isGenericWhisperHallucination,
  transcribeWithGroq,
} from './groqTranscribe';

describe('buildWhisperPrompt', () => {
  it('marks isolated vocabulary so Whisper does not invent a phrase', () => {
    expect(buildWhisperPrompt('heart')).toContain('Isolated spoken word: heart');
  });
});

describe('transcribeWithGroq', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns fallback when API key is missing', async () => {
    const result = await transcribeWithGroq(new Blob(['x']), 'a.webm', '');
    expect(result).toEqual({ ok: false, fallback: true, reason: 'missing_key' });
  });

  it('returns transcript when Groq succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ text: 'leisure' }),
      })
    );

    const result = await transcribeWithGroq(
      new Blob(['x']),
      'a.webm',
      'test-key',
      buildWhisperPrompt('leisure')
    );
    expect(result).toEqual({ ok: true, transcript: 'leisure' });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get('temperature')).toBe('0');
    expect(String(body.get('prompt') || '')).toContain('leisure');
  });

  it('flags common short-clip hallucinations that are not the target', () => {
    expect(isGenericWhisperHallucination('alright', 'heart')).toBe(true);
    expect(isGenericWhisperHallucination('heart', 'heart')).toBe(false);
    expect(isGenericWhisperHallucination('mardet', 'mother')).toBe(false);
  });

  it('returns fallback on rate limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      })
    );

    const result = await transcribeWithGroq(new Blob(['x']), 'a.webm', 'test-key');
    expect(result).toEqual({ ok: false, fallback: true, reason: 'rate_limit' });
  });
});
