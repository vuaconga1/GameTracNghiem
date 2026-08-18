/** Map Word/curly quotes to the straight quotes a keyboard produces. */
export function foldTypedQuotes(value: string): string {
  return value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
}

/**
 * Compare typed answers leniently: trim, lowercase, collapse spaces,
 * fold curly quotes, and drop a trailing run of `. ? ! ; :` (not mid-phrase periods).
 */
export function normalizeTypedAnswer(value: string): string {
  return foldTypedQuotes(
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  ).replace(/[.,!?;:]+$/g, '');
}
