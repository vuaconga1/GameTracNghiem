export const PASS_THRESHOLD = 70;
export const WORD_OK_THRESHOLD = 60;

export type ScoreWordItem = {
  word: string;
  score: number;
};

export type TranscriptScoreResult = {
  mode: 'word' | 'sentence';
  accuracy: number;
  fluency?: number;
  isCorrect: boolean;
  wordScores?: ScoreWordItem[];
  transcript: string;
  targetText: string;
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function similarityPercent(a: string, b: string): number {
  const left = normalizeSpeechText(a);
  const right = normalizeSpeechText(b);
  if (!left && !right) return 100;
  if (!left || !right) return 0;
  const distance = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  return Math.round((1 - distance / maxLen) * 100);
}

export function normalizeSpeechText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?!"'`[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Hesitation noises Whisper/Web Speech prepend to short clips. */
const FILLER_WORDS = new Set(['um', 'uh', 'er', 'ah', 'hmm', 'mm', 'mmm', 'huh', 'erm']);

function tokenizeWords(value: string): string[] {
  return normalizeSpeechText(value).split(' ').filter(Boolean);
}

function stripEdgeFillers(tokens: string[]): string[] {
  let start = 0;
  let end = tokens.length;
  while (start < end && FILLER_WORDS.has(tokens[start])) start += 1;
  while (end > start && FILLER_WORDS.has(tokens[end - 1])) end -= 1;
  return tokens.slice(start, end);
}

/** Extra words Whisper often tacks onto a single-word clip. */
const TRAILING_JUNK = new Set(['it', 'a', 'the', 'to', 'of', 'in', 'and', 'yeah', 'yes']);

/**
 * Isolated-word STT often appends a junk token ("fart it") or fillers ("um heart").
 * Keep the token closest to the target when that is clearly better than the whole string.
 */
export function alignHeardText(targetText: string, transcript: string): string {
  const targetTokens = tokenizeWords(targetText);
  let heardTokens = stripEdgeFillers(tokenizeWords(transcript));
  if (!heardTokens.length) return '';

  if (targetTokens.length === 1) {
    const target = targetTokens[0];
    while (
      heardTokens.length > 1 &&
      TRAILING_JUNK.has(heardTokens[heardTokens.length - 1]) &&
      heardTokens[heardTokens.length - 1] !== target
    ) {
      heardTokens = heardTokens.slice(0, -1);
    }
  }

  const joined = heardTokens.join(' ');
  if (targetTokens.length !== 1 || heardTokens.length === 1) return joined;

  const target = targetTokens[0];
  let best = heardTokens[0];
  let bestScore = similarityPercent(target, heardTokens[0]);
  for (const token of heardTokens.slice(1)) {
    const score = similarityPercent(target, token);
    if (score > bestScore) {
      best = token;
      bestScore = score;
    }
  }

  const fullScore = similarityPercent(target, joined);
  return bestScore > fullScore ? best : joined;
}

export function pickHeardText(targetText: string, alternatives: string[]): string {
  const options = alternatives
    .map((item) => alignHeardText(targetText, item))
    .filter(Boolean);
  if (!options.length) return '';

  let best = options[0];
  let bestScore = similarityPercent(targetText, options[0]);
  for (const item of options.slice(1)) {
    const score = similarityPercent(targetText, item);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

function tokenizeDisplay(targetText: string): string[] {
  return String(targetText || '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?!"'`[\]\\]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function isWordMode(mode: string): boolean {
  return mode === 'phoneme' || mode === 'word' || !mode;
}

export function scoreTranscript(
  targetText: string,
  transcript: string,
  mode: string
): TranscriptScoreResult {
  const normalizedTarget = normalizeSpeechText(targetText);
  const normalizedTranscript =
    mode === 'sentence'
      ? stripEdgeFillers(tokenizeWords(transcript)).join(' ')
      : normalizeSpeechText(alignHeardText(targetText, transcript));

  if (mode === 'sentence') {
    const displayWords = tokenizeDisplay(targetText);
    const spokenWords = normalizedTranscript.split(' ').filter(Boolean);
    const wordScores: ScoreWordItem[] = displayWords.map((word, index) => {
      const spoken = spokenWords[index] || '';
      return {
        word,
        score: similarityPercent(word, spoken),
      };
    });

    const accuracy =
      wordScores.length === 0
        ? 0
        : Math.round(wordScores.reduce((sum, item) => sum + item.score, 0) / wordScores.length);
    const fluentCount = wordScores.filter((item) => item.score >= WORD_OK_THRESHOLD).length;
    const fluency =
      wordScores.length === 0 ? 0 : Math.round((fluentCount / wordScores.length) * 100);

    return {
      mode: 'sentence',
      accuracy,
      fluency,
      isCorrect: accuracy >= PASS_THRESHOLD,
      wordScores,
      transcript: normalizedTranscript,
      targetText: normalizedTarget,
    };
  }

  if (!isWordMode(mode) && mode !== 'phoneme' && mode !== 'word') {
    // Unknown modes still score as word against full string
  }

  const accuracy = similarityPercent(normalizedTarget, normalizedTranscript);
  return {
    mode: 'word',
    accuracy,
    isCorrect: accuracy >= PASS_THRESHOLD,
    transcript: normalizedTranscript,
    targetText: normalizedTarget,
  };
}
