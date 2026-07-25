export type TranscriptLine = {
  role: 'user' | 'assistant';
  text: string;
  at: number;
};

/**
 * Merge a new transcript fragment into the chat list.
 * User ASR can finish AFTER the assistant already started speaking, so we must
 * dedupe against recent user lines — not only the last bubble.
 */
export function appendTranscriptLine(
  prev: TranscriptLine[],
  role: 'user' | 'assistant',
  text: string,
  at = Date.now()
): TranscriptLine[] {
  const trimmed = text.trim();
  if (!trimmed) return prev;

  const last = prev[prev.length - 1];

  if (last && last.role === role) {
    if (last.text === trimmed) return prev;
    if (
      trimmed.startsWith(last.text) ||
      last.text.startsWith(trimmed) ||
      trimmed.includes(last.text)
    ) {
      const better = trimmed.length >= last.text.length ? trimmed : last.text;
      return [...prev.slice(0, -1), { ...last, text: better }];
    }
    return [...prev.slice(0, -1), { ...last, text: `${last.text} ${trimmed}`.trim() }];
  }

  if (role === 'user') {
    for (let i = prev.length - 1; i >= 0; i -= 1) {
      const row = prev[i];
      if (row.role !== 'user') continue;
      if (row.text === trimmed) return prev;
      if (trimmed.startsWith(row.text) || row.text.startsWith(trimmed)) {
        const better = trimmed.length >= row.text.length ? trimmed : row.text;
        const next = prev.slice();
        next[i] = { ...row, text: better };
        return next;
      }
      // Only look at the most recent user turn for fuzzy merge.
      break;
    }
  }

  return [...prev, { role, text: trimmed, at }];
}
