import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  scoreGuidedDrill,
  parseDrillAudioDurationMs,
  transcribeDrillAudio,
  validateDrillAudio,
} from '@/lib/speaking/openaiDrills';
import { guidedAssessmentSchema } from '@/lib/speaking/drillSchemas';

function webmBytes(): Uint8Array {
  return new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  ]);
}

function oneSecondWav(): Uint8Array {
  const sampleRate = 8_000;
  const dataSize = sampleRate * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
}

describe('OpenAI short-drill adapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('validates MIME and magic bytes then requests English transcription', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ text: 'We should recycle more.' }),
      );
    const audio = validateDrillAudio({
      bytes: webmBytes(),
      mimeType: 'audio/webm;codecs=opus',
      durationMs: 2_000,
    });

    const result = await transcribeDrillAudio(audio);

    expect(result).toEqual({
      transcript: 'We should recycle more.',
      model: 'gpt-4o-mini-transcribe',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
    const [, init] = fetchMock.mock.calls[0];
    const form = init?.body as FormData;
    expect(form.get('model')).toBe('gpt-4o-mini-transcribe');
    expect(form.get('language')).toBe('en');
    expect((form.get('file') as File).type).toBe('audio/webm');
  });

  it('derives duration from server-parsed bytes instead of client telemetry', async () => {
    await expect(
      parseDrillAudioDurationMs({
        bytes: oneSecondWav(),
        mimeType: 'audio/wav',
      }),
    ).resolves.toBe(1_000);
  });

  it('rejects a MIME/magic-byte mismatch before calling OpenAI', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    expect(() =>
      validateDrillAudio({
        bytes: webmBytes(),
        mimeType: 'audio/wav',
        durationMs: 1_000,
      }),
    ).toThrow(/format could not be verified/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses strict guided JSON and retries invalid output once', async () => {
    const invalid = {
      score: 80,
      relevanceScore: 80,
      completenessScore: 80,
      languageScore: 80,
      praise: 'Good answer.',
      improvement: 'Add one detail.',
      unknown: true,
    };
    const valid = {
      score: 82,
      relevanceScore: 85,
      completenessScore: 78,
      languageScore: 83,
      praise: 'You answered the question clearly.',
      improvement: 'Add one example next time.',
    };
    expect(guidedAssessmentSchema.safeParse(invalid).success).toBe(false);
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          choices: [{ message: { content: JSON.stringify(invalid) } }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          choices: [{ message: { content: JSON.stringify(valid) } }],
        }),
      );

    const result = await scoreGuidedDrill({
      payload: {
        kind: 'guided',
        questionText: 'How do you help the environment?',
        acceptedAnswers: [],
        sampleAnswers: ['I recycle paper.'],
        keywords: ['recycle'],
        hints: [],
      },
      transcript: 'I recycle bottles at home.',
      locale: 'en',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.assessment).toEqual(valid);
    const [, init] = fetchMock.mock.calls[1];
    const body = JSON.parse(String(init?.body));
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(
      body.response_format.json_schema.schema.additionalProperties,
    ).toBe(false);
    expect(body.messages[0].content).toMatch(/varied, simple answers/i);
    expect(body.messages[0].content).toMatch(/Never claim to assess phonemes/i);
  });
});
