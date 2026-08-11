import { describe, expect, it } from 'vitest';

import { pickEnglishVoice } from './audio';

function voice(partial: Partial<SpeechSynthesisVoice> & { name: string; lang: string }) {
  return {
    default: false,
    localService: true,
    voiceURI: partial.name,
    ...partial,
  } as SpeechSynthesisVoice;
}

describe('pickEnglishVoice', () => {
  it('prefers en-US neural/google voices over other English voices', () => {
    const chosen = pickEnglishVoice([
      voice({ name: 'Microsoft Mark', lang: 'en-GB' }),
      voice({ name: 'Google US English', lang: 'en-US' }),
      voice({ name: 'Vietnamese Female', lang: 'vi-VN' }),
    ]);
    expect(chosen?.name).toBe('Google US English');
  });

  it('falls back to any English voice when no en-US exists', () => {
    const chosen = pickEnglishVoice([
      voice({ name: 'Daniel', lang: 'en-GB' }),
      voice({ name: 'Linh', lang: 'vi-VN' }),
    ]);
    expect(chosen?.lang).toBe('en-GB');
  });

  it('returns null when there is no English voice', () => {
    expect(
      pickEnglishVoice([voice({ name: 'Linh', lang: 'vi-VN' })]),
    ).toBeNull();
  });
});
