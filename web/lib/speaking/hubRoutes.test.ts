import { describe, expect, it } from 'vitest';

import {
  hasLegacySpeakingDeepLink,
  legacySpeakingConversationPath,
  speakingActivityPath,
  speakingLoginHref,
} from '@/lib/speaking/hubRoutes';

describe('Speaking hub routes', () => {
  it('builds the four internal child destinations', () => {
    expect(speakingActivityPath('course 1', 'WORD_PRONUNCIATION')).toBe(
      '/speaking/course%201/word-pronunciation',
    );
    expect(speakingActivityPath('course 1', 'SENTENCE_READING')).toBe(
      '/speaking/course%201/sentence-reading',
    );
    expect(speakingActivityPath('course 1', 'GUIDED_ANSWER')).toBe(
      '/speaking/course%201/guided-answer',
    );
    expect(speakingActivityPath('course 1', 'REALTIME_CONVERSATION')).toBe(
      '/speaking/course%201/conversation',
    );
  });

  it('redirects old deep links while carrying only known encoded parameters', () => {
    const target = legacySpeakingConversationPath('course/1', {
      topicId: 'topic & one',
      previewSession: ['preview=2', 'ignored'],
      legacyRealtime: '1',
    });

    expect(target).toBe(
      '/speaking/course%2F1/conversation?topicId=topic+%26+one&previewSession=preview%3D2&legacyRealtime=1',
    );
    expect(target).not.toContain('ignored');
  });

  it('does not treat unrelated or invalid values as a legacy deep link', () => {
    expect(hasLegacySpeakingDeepLink({})).toBe(false);
    expect(
      hasLegacySpeakingDeepLink({
        topicId: '\u0000unsafe',
        previewSession: '',
      }),
    ).toBe(false);
  });

  it('encodes a safe internal login destination', () => {
    expect(
      speakingLoginHref('/speaking/course-1/conversation?topicId=topic-1'),
    ).toBe(
      '/login?next=%2Fspeaking%2Fcourse-1%2Fconversation%3FtopicId%3Dtopic-1',
    );
    expect(speakingLoginHref('//evil.example/path')).toBe('/login?next=%2F');
  });
});
