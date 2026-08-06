import type {
  SentenceDrillPayload,
  WordDrillPayload,
} from '@/lib/speaking/drillSchemas';

export type DrillLocale = 'vi' | 'en';

export type DeterministicDrillScore = {
  score: number;
  details: {
    scoringMethod: 'transcript_practice_v1';
    completeness: number;
    order: number;
    similarity: number;
    pace: number;
    wordsPerMinute: number;
    matchedTarget: string;
  };
  feedback: {
    label: string;
    praise: string;
    improvement: string;
    disclaimer: string;
  };
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeDrillText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  const normalized = normalizeDrillText(value);
  return normalized ? normalized.split(' ') : [];
}

function lcsLength(left: string[], right: string[]): number {
  const row = new Array<number>(right.length + 1).fill(0);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = 0;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] =
        left[leftIndex - 1] === right[rightIndex - 1]
          ? diagonal + 1
          : Math.max(row[rightIndex], row[rightIndex - 1]);
      diagonal = previous;
    }
  }
  return row[right.length];
}

function bagMatchCount(target: string[], spoken: string[]): number {
  const remaining = new Map<string, number>();
  for (const token of spoken) {
    remaining.set(token, (remaining.get(token) ?? 0) + 1);
  }
  let count = 0;
  for (const token of target) {
    const available = remaining.get(token) ?? 0;
    if (available > 0) {
      count += 1;
      remaining.set(token, available - 1);
    }
  }
  return count;
}

function levenshtein(left: string, right: string): number {
  if (!left) return right.length;
  if (!right) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

function textSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeDrillText(left);
  const normalizedRight = normalizeDrillText(right);
  const longest = Math.max(normalizedLeft.length, normalizedRight.length);
  if (longest === 0) return 100;
  return clampScore(
    (1 - levenshtein(normalizedLeft, normalizedRight) / longest) * 100,
  );
}

function paceScore(wordCount: number, durationMs: number) {
  const safeDuration = Math.max(250, durationMs);
  const wordsPerMinute = Math.round((wordCount * 60_000) / safeDuration);
  let score = 100;
  if (wordsPerMinute < 35) {
    score = (wordsPerMinute / 35) * 100;
  } else if (wordsPerMinute > 190) {
    score = Math.max(0, 100 - ((wordsPerMinute - 190) / 190) * 100);
  }
  return { score: clampScore(score), wordsPerMinute };
}

function feedback(
  locale: DrillLocale,
  scores: Omit<DeterministicDrillScore['details'], 'scoringMethod' | 'matchedTarget'>,
): DeterministicDrillScore['feedback'] {
  const strongest = Math.max(
    scores.completeness,
    scores.order,
    scores.similarity,
    scores.pace,
  );
  const weakest = Math.min(
    scores.completeness,
    scores.order,
    scores.similarity,
    scores.pace,
  );

  if (locale === 'vi') {
    const praise =
      strongest === scores.order
        ? 'Em đã giữ thứ tự từ rất tốt.'
        : strongest === scores.completeness
          ? 'Em đã nói được phần lớn nội dung cần luyện.'
          : strongest === scores.pace
            ? 'Tốc độ nói của em phù hợp với bài luyện.'
            : 'Bản chép lời của em khá gần với nội dung mẫu.';
    const improvement =
      weakest === scores.completeness
        ? 'Lần tới, em hãy nói đủ toàn bộ từ trong nội dung mẫu.'
        : weakest === scores.order
          ? 'Lần tới, em hãy giữ các từ đúng thứ tự như nội dung mẫu.'
          : weakest === scores.pace
            ? 'Lần tới, em hãy nói với tốc độ đều và tự nhiên hơn.'
            : 'Lần tới, em hãy nghe mẫu rồi thử nói lại sát nội dung hơn.';
    return {
      label: 'Phản hồi luyện tập',
      praise,
      improvement,
      disclaimer:
        'Điểm này chỉ so sánh bản chép lời và tốc độ; không đánh giá âm vị hay giọng nói.',
    };
  }

  const praise =
    strongest === scores.order
      ? 'You kept the words in a strong order.'
      : strongest === scores.completeness
        ? 'You included most of the practice target.'
        : strongest === scores.pace
          ? 'Your speaking pace suited this practice.'
          : 'Your transcript was close to the practice target.';
  const improvement =
    weakest === scores.completeness
      ? 'Next time, include every word in the practice target.'
      : weakest === scores.order
        ? 'Next time, keep the words in the same order as the target.'
        : weakest === scores.pace
          ? 'Next time, use a steadier, more natural pace.'
          : 'Next time, listen to the sample and match the target text more closely.';
  return {
    label: 'Practice feedback',
    praise,
    improvement,
    disclaimer:
      'This score compares transcript text and pace only; it does not assess phonemes or accent.',
  };
}

export function scoreDeterministicDrill(input: {
  payload: WordDrillPayload | SentenceDrillPayload;
  transcript: string;
  durationMs: number;
  locale: DrillLocale;
}): DeterministicDrillScore {
  const candidates = [
    input.payload.targetText,
    ...input.payload.acceptedAnswers,
  ];
  const spokenTokens = tokens(input.transcript);
  const scored = candidates.map((candidate) => {
    const targetTokens = tokens(candidate);
    const targetCount = Math.max(1, targetTokens.length);
    const completeness = clampScore(
      (bagMatchCount(targetTokens, spokenTokens) / targetCount) * 100,
    );
    const order = clampScore(
      (lcsLength(targetTokens, spokenTokens) / targetCount) * 100,
    );
    const similarity = textSimilarity(candidate, input.transcript);
    return { candidate, completeness, order, similarity };
  });
  const best = scored.reduce((current, candidate) => {
    const currentValue =
      current.completeness + current.order + current.similarity;
    const candidateValue =
      candidate.completeness + candidate.order + candidate.similarity;
    return candidateValue > currentValue ? candidate : current;
  });
  const pace = paceScore(spokenTokens.length, input.durationMs);
  const details = {
    scoringMethod: 'transcript_practice_v1' as const,
    completeness: best.completeness,
    order: best.order,
    similarity: best.similarity,
    pace: pace.score,
    wordsPerMinute: pace.wordsPerMinute,
    matchedTarget: best.candidate,
  };
  const score = clampScore(
    details.completeness * 0.35 +
      details.order * 0.3 +
      details.similarity * 0.25 +
      details.pace * 0.1,
  );

  return {
    score,
    details,
    feedback: feedback(input.locale, details),
  };
}
