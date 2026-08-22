import { normalizeSpeechText } from './scoreTranscript';

export type LetterDiffStatus = 'match' | 'mismatch' | 'missing' | 'extra';

export type LetterDiff = {
  /** Target character shown in the Sound column (empty for extras). */
  sound: string;
  /** Heard character for Score column when wrong; null when match. */
  heard: string | null;
  status: LetterDiffStatus;
};

/**
 * Align target vs STT transcript letter-by-letter (Levenshtein path)
 * so each target sound can be marked green/red with the heard char when wrong.
 */
export function compareLetters(targetText: string, transcript: string): LetterDiff[] {
  const target = normalizeSpeechText(targetText);
  const heard = normalizeSpeechText(transcript);
  if (!target && !heard) return [];

  const rows = target.length + 1;
  const cols = heard.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dist[i][0] = i;
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = target[i - 1] === heard[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }

  const diffs: LetterDiff[] = [];
  let i = target.length;
  let j = heard.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && target[i - 1] === heard[j - 1] && dist[i][j] === dist[i - 1][j - 1]) {
      diffs.push({ sound: target[i - 1], heard: null, status: 'match' });
      i -= 1;
      j -= 1;
      continue;
    }
    if (
      i > 0 &&
      j > 0 &&
      dist[i][j] === dist[i - 1][j - 1] + 1
    ) {
      diffs.push({
        sound: target[i - 1],
        heard: heard[j - 1],
        status: 'mismatch',
      });
      i -= 1;
      j -= 1;
      continue;
    }
    if (j > 0 && dist[i][j] === dist[i][j - 1] + 1) {
      diffs.push({ sound: '', heard: heard[j - 1], status: 'extra' });
      j -= 1;
      continue;
    }
    if (i > 0 && dist[i][j] === dist[i - 1][j] + 1) {
      diffs.push({ sound: target[i - 1], heard: null, status: 'missing' });
      i -= 1;
      continue;
    }
    // Fallback: prefer diagonal then delete/insert
    if (i > 0 && j > 0) {
      diffs.push({
        sound: target[i - 1],
        heard: heard[j - 1],
        status: target[i - 1] === heard[j - 1] ? 'match' : 'mismatch',
      });
      i -= 1;
      j -= 1;
    } else if (i > 0) {
      diffs.push({ sound: target[i - 1], heard: null, status: 'missing' });
      i -= 1;
    } else {
      diffs.push({ sound: '', heard: heard[j - 1], status: 'extra' });
      j -= 1;
    }
  }

  diffs.reverse();
  return diffs;
}
