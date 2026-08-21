import { normalizeMediaKey } from '@/lib/media/normalizeMediaKey';
import { resolveVocabAudioUrl } from '@/lib/vocabAudio';

import audioMap from '@/lib/data/primaryVocabAudioMap.json';

type PrimaryVocabAudioMap = {
  byGradeUnitWord: Record<string, string>;
  byWord: Record<string, string>;
};

const map = audioMap as PrimaryVocabAudioMap;

export function wewinAudioPublicUrl(relativePath: string): string {
  const cleaned = relativePath.replace(/^[/\\]+/, '').split(/[/\\]/).map(encodeURIComponent).join('/');
  return `/api/wewin-audio/${cleaned}`;
}

/** Resolve a playable mp3 URL for a primary vocab word, or null if missing. */
export function resolvePrimaryVocabAudioUrl(input: {
  levelName: string;
  unit: number;
  word: string;
}): string | null {
  // Prefer static ElevenLabs / renamed vocab files (works on Vercel).
  const staticUrl = resolveVocabAudioUrl(input.word);
  if (staticUrl) return staticUrl;

  const wordKey = normalizeMediaKey(input.word);
  if (!wordKey) return null;
  const specific = map.byGradeUnitWord[`${input.levelName}|${input.unit}|${wordKey}`];
  const fallback = map.byWord[wordKey];
  const rel = specific || fallback;
  return rel ? wewinAudioPublicUrl(rel) : null;
}
