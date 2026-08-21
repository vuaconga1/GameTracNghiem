import { describe, expect, it } from 'vitest';

import {
  resolveVocabAudioUrl,
  vocabAudioPublicUrl,
  vocabAudioSafeStem,
} from './vocabAudio';

describe('vocabAudio', () => {
  it('encodes filenames for public URLs', () => {
    expect(vocabAudioPublicUrl('a big city.mp3')).toBe('/audio/vocab/a%20big%20city.mp3');
  });

  it('normalizes slash words the same way rename safeStem does', () => {
    expect(vocabAudioSafeStem('3PL / 4PL')).toBe('3PL 4PL');
  });

  it('resolves a known mapped word to a public mp3 URL', () => {
    const url = resolveVocabAudioUrl('elderly');
    expect(url).toBe('/audio/vocab/elderly.mp3');
  });

  it('resolves slash words via safe-stem alias', () => {
    const url = resolveVocabAudioUrl('3PL / 4PL');
    expect(url).toMatch(/\/audio\/vocab\//);
    expect(url).toMatch(/3PL/);
  });

  it('returns null when no audio exists', () => {
    expect(resolveVocabAudioUrl('zzzz-not-a-real-word-xyz')).toBeNull();
  });
});
