import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SPEAKING_CHARACTER_ID,
  getSpeakingCharacter,
  isSpeakingCharacterId,
  resolveSpeakingVoice,
  SPEAKING_VOICE_CHARACTERS,
} from '@/lib/speaking/voiceCharacters';

describe('voiceCharacters', () => {
  it('defines four unique characters with OpenAI voices', () => {
    expect(SPEAKING_VOICE_CHARACTERS).toHaveLength(4);
    const voices = SPEAKING_VOICE_CHARACTERS.map((character) => character.voice);
    expect(new Set(voices).size).toBe(4);
    expect(SPEAKING_VOICE_CHARACTERS.every((character) => character.avatar.startsWith('/images/speaking/voices/'))).toBe(true);
  });

  it('validates character ids', () => {
    expect(isSpeakingCharacterId('bo')).toBe(true);
    expect(isSpeakingCharacterId('marin')).toBe(false);
    expect(isSpeakingCharacterId(null)).toBe(false);
  });

  it('falls back to the default character', () => {
    expect(getSpeakingCharacter('unknown').id).toBe(DEFAULT_SPEAKING_CHARACTER_ID);
    expect(resolveSpeakingVoice('mia')).toBe('coral');
    expect(resolveSpeakingVoice(undefined)).toBe('marin');
  });
});
