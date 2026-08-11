import { describe, expect, it } from 'vitest';

import { resolvePrimaryVocabAudioUrl, wewinAudioPublicUrl } from './primaryVocabAudio';

describe('primaryVocabAudio', () => {
  it('builds a public URL for wewin audio paths', () => {
    expect(wewinAudioPublicUrl('starter/unit 6/Toys/ball.mp3')).toBe(
      '/api/wewin-audio/starter/unit%206/Toys/ball.mp3',
    );
  });

  it('resolves matched Lớp 1 words to an mp3 URL', () => {
    const url = resolvePrimaryVocabAudioUrl({
      levelName: 'Lớp 1',
      unit: 1,
      word: 'ball',
    });
    expect(url).toMatch(/^\/api\/wewin-audio\//);
    expect(url).toMatch(/ball\.mp3$/);
  });

  it('returns null when no audio exists for the word', () => {
    expect(
      resolvePrimaryVocabAudioUrl({
        levelName: 'Lớp 1',
        unit: 1,
        word: 'zzzz-not-a-real-word',
      }),
    ).toBeNull();
  });
});
