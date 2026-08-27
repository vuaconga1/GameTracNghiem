'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  isSpeakingCharacterId,
  type SpeakingVoiceCharacterId,
} from '@/lib/speaking/voiceCharacters';

export const SPEAKING_CHARACTER_STORAGE_KEY = 'wewin_speaking_character';

/**
 * Persisted (localStorage) selection of the AI Speaking character.
 *
 * `characterId` is null until a choice is made, which lets callers show the
 * picker on first visit and skip it on return visits. `hydrated` flips to true
 * after the first client read so SSR/first paint doesn't force the picker open.
 */
export function useSpeakingCharacter() {
  const [characterId, setCharacterId] =
    useState<SpeakingVoiceCharacterId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        SPEAKING_CHARACTER_STORAGE_KEY,
      );
      if (isSpeakingCharacterId(stored)) {
        setCharacterId(stored);
      }
    } catch {
      /* ignore storage errors */
    }
    setHydrated(true);
  }, []);

  const chooseCharacter = useCallback((id: SpeakingVoiceCharacterId) => {
    setCharacterId(id);
    try {
      window.localStorage.setItem(SPEAKING_CHARACTER_STORAGE_KEY, id);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return { characterId, chooseCharacter, hydrated };
}
