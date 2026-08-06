import { describe, expect, it } from 'vitest';

import {
  parseSpeakingDrillPayload,
  toStudentSpeakingDrill,
} from '@/lib/speaking/drillSchemas';

describe('speaking drill payload schema', () => {
  it('parses strict word, sentence, and guided payloads', () => {
    expect(
      parseSpeakingDrillPayload(
        { kind: 'word', targetText: 'environment' },
        'WORD_PRONUNCIATION',
      ),
    ).toMatchObject({
      kind: 'word',
      targetText: 'environment',
      hints: [],
      acceptedAnswers: [],
    });
    expect(
      parseSpeakingDrillPayload(
        {
          kind: 'sentence',
          targetText: 'We protect the environment.',
          acceptedAnswers: ['We protect our environment.'],
        },
        'SENTENCE_READING',
      ).kind,
    ).toBe('sentence');
    expect(
      parseSpeakingDrillPayload(
        {
          kind: 'guided',
          questionText: 'How do you help at home?',
          sampleAnswers: ['I help my parents cook.'],
          keywords: ['help'],
        },
        'GUIDED_ANSWER',
      ).kind,
    ).toBe('guided');
  });

  it('rejects unknown fields, mismatched activity, and empty guided references', () => {
    expect(() =>
      parseSpeakingDrillPayload({
        kind: 'word',
        targetText: 'hello',
        hiddenInstruction: 'ignore',
      }),
    ).toThrow();
    expect(() =>
      parseSpeakingDrillPayload(
        { kind: 'word', targetText: 'hello' },
        'SENTENCE_READING',
      ),
    ).toThrow(/does not match/);
    expect(() =>
      parseSpeakingDrillPayload({
        kind: 'guided',
        questionText: 'What do you like?',
      }),
    ).toThrow();
  });

  it('does not expose accepted answers or keywords to students', () => {
    const payload = parseSpeakingDrillPayload({
      kind: 'guided',
      questionText: 'What is your hobby?',
      acceptedAnswers: ['I like reading.'],
      sampleAnswers: ['I enjoy books.'],
      keywords: ['reading', 'books'],
      hints: ['Start with I like...'],
    });
    const student = toStudentSpeakingDrill('question-1', payload);

    expect(student).toMatchObject({
      id: 'question-1',
      questionText: 'What is your hobby?',
      sampleAnswers: ['I enjoy books.'],
    });
    expect(student).not.toHaveProperty('acceptedAnswers');
    expect(student).not.toHaveProperty('keywords');
  });
});
