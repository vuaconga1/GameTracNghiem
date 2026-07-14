import { describe, expect, it } from 'vitest';

import {
  grammarPayloadSchema,
  lookAndWritePayloadSchema,
  parseGamePayload,
  questionPreview,
} from './payloadSchemas';

describe('admin payloadSchemas', () => {
  it('parses grammar payload', () => {
    const payload = grammarPayloadSchema.parse({
      prefix: 'She',
      suffix: 'to school.',
      answers: ['goes'],
    });
    expect(payload.prefix).toBe('She');
    expect(payload.answers).toEqual(['goes']);
  });

  it('rejects empty quiz question', () => {
    expect(() =>
      parseGamePayload('quiz', {
        type: 'multiple_choice',
        question: '',
        answer: 'goes',
      })
    ).toThrow();
  });

  it('parses look_and_write exercise', () => {
    const payload = lookAndWritePayloadSchema.parse({
      title: 'Animals',
      items: [{ order: 1, image: '', answer: 'cat' }],
    });
    expect(payload.title).toBe('Animals');
    expect(payload.items).toHaveLength(1);
  });

  it('builds previews', () => {
    expect(
      questionPreview('grammar', { prefix: 'She', suffix: 'school.', answers: ['goes'] })
    ).toContain('She');
    expect(questionPreview('quiz', { question: 'Hello?' })).toBe('Hello?');
  });
});
