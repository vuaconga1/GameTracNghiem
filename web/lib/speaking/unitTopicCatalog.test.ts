import { describe, expect, it } from 'vitest';

import {
  listCataloguedSpeakingUnits,
  speakingTopicForUnit,
} from '@/lib/speaking/unitTopicCatalog';

describe('speaking unit topic catalog', () => {
  const all = listCataloguedSpeakingUnits();

  it('covers every Global Success unit with exactly 5 questions', () => {
    expect(all.length).toBeGreaterThanOrEqual(91);
    for (const item of all) {
      expect(item.questions).toHaveLength(5);
      expect(item.questions.every((question) => question.trim().length > 0)).toBe(
        true,
      );
      expect(item.topicTitle.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses sentence-practice titles for grades 1–5 and chat titles for 6–9', () => {
    expect(speakingTopicForUnit({ levelName: 'Lớp 1', unit: 1 }).topicTitle).toBe(
      'In The School Playground',
    );
    expect(speakingTopicForUnit({ levelName: 'Lớp 4', unit: 1 }).questions[1]).toBe(
      'Who is your best friend?',
    );
    expect(speakingTopicForUnit({ levelName: 'Lớp 8', unit: 1 }).topicTitle).toBe(
      'Chat about leisure time',
    );
  });
});
