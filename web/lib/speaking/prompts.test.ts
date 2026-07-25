import { describe, expect, it } from 'vitest';

import {
  buildDefaultTopicInstructions,
  buildSpeakingRealtimeInstructions,
  getSpeakingPaceLinesByGrade,
  SPEAKING_OPENING_INSTRUCTIONS,
} from '@/lib/speaking/prompts';

describe('buildDefaultTopicInstructions', () => {
  it('uses Pre-A1 to low A1 for grades 1–5 (ages 6–10 international)', () => {
    const text = buildDefaultTopicInstructions({
      topicTitle: 'Chat about my friends',
      grade: 4,
    });
    expect(text).toContain('Chat about my friends');
    expect(text).toMatch(/4th-grade student \(Pre-A1 to low A1\)/);
    expect(text).toMatch(/ages 6–10|aged 6–10/i);
    expect(text).toMatch(/NEVER ask the student to "repeat after you"/i);
    expect(text).toMatch(/extremely easy/i);
  });

  it('uses A1–A2 for grades 6–9 (ages 10–14 international)', () => {
    const text = buildDefaultTopicInstructions({
      topicTitle: 'Chat about leisure time',
      levelName: 'Lớp 8',
    });
    expect(text).toContain('Chat about leisure time');
    expect(text).toMatch(/8th-grade student \(A1–A2\)/);
    expect(text).toMatch(/ages 10–14|aged 10–14/i);
    expect(text).toMatch(/NEVER ask the student to "repeat after you"/i);
  });
});

describe('getSpeakingPaceLinesByGrade', () => {
  it('requires extremely slow speech for grades 1–5', () => {
    const text = getSpeakingPaceLinesByGrade(4).join(' ');
    expect(text).toMatch(/EXTREMELY SLOWLY/i);
    expect(text).toMatch(/spoken English only/i);
    expect(text).not.toMatch(/a LITTLE faster/i);
  });

  it('requires slightly faster (but still slow) speech for grades 6–9', () => {
    const text = getSpeakingPaceLinesByGrade(8).join(' ');
    expect(text).toMatch(/a LITTLE faster/i);
    expect(text).toMatch(/SLOWLY and CLEARLY/i);
    expect(text).toMatch(/spoken English only/i);
    expect(text).not.toMatch(/EXTREMELY SLOWLY/i);
  });
});

describe('buildSpeakingRealtimeInstructions', () => {
  it('keeps DB topic text and appends grade-band voice rules', () => {
    const text = buildSpeakingRealtimeInstructions({
      topicInstructions: 'Custom topic rules here.',
      topicTitle: 'Chat about leisure time',
      levelName: 'Lớp 8',
    });
    expect(text).toContain('Custom topic rules here.');
    expect(text).toMatch(/a LITTLE faster/i);
  });
});

describe('SPEAKING_OPENING_INSTRUCTIONS', () => {
  it('asks for WeWIN intro, warm greeting, and first question', () => {
    expect(SPEAKING_OPENING_INSTRUCTIONS).toMatch(/Greet the student warmly/i);
    expect(SPEAKING_OPENING_INSTRUCTIONS).toMatch(/AI assistant of WeWIN Education/i);
    expect(SPEAKING_OPENING_INSTRUCTIONS).toMatch(/first simple question/i);
  });
});
