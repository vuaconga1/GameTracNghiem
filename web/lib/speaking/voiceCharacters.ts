/**
 * Fixed set of AI Speaking "characters" the student can choose before a
 * conversation. Each character maps to one OpenAI Realtime voice.
 *
 * Pure module (no server-only imports) so it can be shared by the client
 * picker UI and the server realtime route that validates the chosen voice.
 * Display names + intros live in i18n (speaking.characters.<id>.*).
 */

export type SpeakingVoiceCharacterId = 'bo' | 'mia' | 'leo' | 'suki';

export type SpeakingVoiceCharacter = {
  id: SpeakingVoiceCharacterId;
  /** OpenAI Realtime voice id (locked at session start). */
  voice: string;
  /** Avatar path under public/. */
  avatar: string;
  /** i18n key for the display name (speaking.characters.<id>.name). */
  nameKey: string;
  /** i18n key for the short intro (speaking.characters.<id>.intro). */
  introKey: string;
  /** Accent color used by the picker tile. */
  color: string;
  /**
   * Light, non-mandatory persona flavor appended to Realtime instructions.
   * Kept intentionally soft — it never promises a specific accent and is
   * always subordinate to the mandatory safety/grade/voice blocks.
   */
  promptFlavor: string;
};

export const SPEAKING_VOICE_CHARACTERS: readonly SpeakingVoiceCharacter[] = [
  {
    id: 'bo',
    voice: 'marin',
    avatar: '/images/speaking/voices/bo.svg',
    nameKey: 'speaking.characters.bo.name',
    introKey: 'speaking.characters.bo.intro',
    color: '#2f5bd0',
    promptFlavor:
      'Your friendly WeWIN name is Bo. Keep a warm, calm and encouraging tone, like a patient guide.',
  },
  {
    id: 'mia',
    voice: 'coral',
    avatar: '/images/speaking/voices/mia.svg',
    nameKey: 'speaking.characters.mia.name',
    introKey: 'speaking.characters.mia.intro',
    color: '#e6a700',
    promptFlavor:
      'Your friendly WeWIN name is Mia. Keep a cheerful, bright and playful tone that makes the student smile.',
  },
  {
    id: 'leo',
    voice: 'sage',
    avatar: '/images/speaking/voices/leo.svg',
    nameKey: 'speaking.characters.leo.name',
    introKey: 'speaking.characters.leo.intro',
    color: '#1f9d6b',
    promptFlavor:
      'Your friendly WeWIN name is Leo. Keep a thoughtful, steady and reassuring tone, like a kind older buddy.',
  },
  {
    id: 'suki',
    voice: 'ash',
    avatar: '/images/speaking/voices/suki.svg',
    nameKey: 'speaking.characters.suki.name',
    introKey: 'speaking.characters.suki.intro',
    color: '#7a5cff',
    promptFlavor:
      'Your friendly WeWIN name is Suki. Keep a lively, energetic and upbeat tone that keeps the chat fun.',
  },
] as const;

export const DEFAULT_SPEAKING_CHARACTER_ID: SpeakingVoiceCharacterId = 'bo';

const CHARACTER_BY_ID = new Map<string, SpeakingVoiceCharacter>(
  SPEAKING_VOICE_CHARACTERS.map((character) => [character.id, character]),
);

export function isSpeakingCharacterId(
  value: unknown,
): value is SpeakingVoiceCharacterId {
  return typeof value === 'string' && CHARACTER_BY_ID.has(value);
}

/** Resolve a character by id, falling back to the recommended default. */
export function getSpeakingCharacter(
  id: unknown,
): SpeakingVoiceCharacter {
  if (typeof id === 'string') {
    const found = CHARACTER_BY_ID.get(id);
    if (found) return found;
  }
  return CHARACTER_BY_ID.get(DEFAULT_SPEAKING_CHARACTER_ID)!;
}

/** Resolve just the OpenAI voice id for a chosen character. */
export function resolveSpeakingVoice(id: unknown): string {
  return getSpeakingCharacter(id).voice;
}
