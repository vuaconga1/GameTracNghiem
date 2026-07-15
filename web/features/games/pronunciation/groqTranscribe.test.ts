import { describe, expect, it, vi, afterEach } from 'vitest';

import { transcribeWithGroq } from './groqTranscribe';

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

    const result = await transcribeWithGroq(new Blob(['x']), 'a.webm', 'test-key');
    expect(result).toEqual({ ok: true, transcript: 'leisure' });
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
