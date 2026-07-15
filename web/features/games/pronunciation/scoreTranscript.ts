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
  const normalizedTranscript = normalizeSpeechText(transcript);

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
