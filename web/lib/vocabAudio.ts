import { normalizeMediaKey } from '@/lib/media/normalizeMediaKey';

import audioMap from '@/lib/data/vocabAudioMap.json';

type VocabAudioMap = {
  version?: number;
  publicPrefix?: string;
  byWord: Record<string, string>;
};

const map = audioMap as VocabAudioMap;
const PUBLIC_PREFIX = (map.publicPrefix || '/audio/vocab').replace(/\/+$/, '');

/** Filename-safe stem used when ElevenLabs files were renamed (slashes → spaces). */
export function vocabAudioSafeStem(word: string): string {
  return String(word || '')
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function vocabAudioPublicUrl(filename: string): string {
  const cleaned = filename.replace(/^[/\\]+/, '');
  return `${PUBLIC_PREFIX}/${encodeURIComponent(cleaned)}`;
}

/** Resolve a static mp3 URL for a vocab word, or null if no file is mapped. */
export function resolveVocabAudioUrl(word: string): string | null {
  const raw = String(word || '').trim();
  if (!raw) return null;

  const keys = [normalizeMediaKey(raw), normalizeMediaKey(vocabAudioSafeStem(raw))];
  for (const key of keys) {
    if (!key) continue;
    const filename = map.byWord[key];
    if (filename) return vocabAudioPublicUrl(filename);
  }
  return null;
}
