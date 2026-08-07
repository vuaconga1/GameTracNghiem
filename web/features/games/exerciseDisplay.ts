/** UI helpers: show meaningful exercise titles instead of workbook codes like "U4 Ex14". */

const EXERCISE_CODE_RE = /^U\d+\s*Ex\d+/i;
const EXERCISE_ANNOTATION_RE = /\s*\(Ex\s*\d+\)\s*$/i;

const TYPE_LABEL_INSTRUCTIONS_VI: Record<string, string> = {
  'Find the mistake': 'Gạch lỗi sai trong câu và viết lại câu đúng.',
  'Word form': 'Cho dạng đúng của từ để hoàn thành câu.',
  'Verb form': 'Cho dạng đúng của động từ để hoàn thành câu.',
  'Circle correct form': 'Chọn dạng đúng của từ trong câu.',
  'Tìm lỗi sai': 'Tìm lỗi sai và chọn đáp án đúng.',
  'Đọc hiểu': 'Đọc đoạn văn và chọn đáp án đúng.',
  'Đọc hiểu điền khuyết': 'Đọc đoạn văn và chọn đáp án đúng cho chỗ trống.',
  'Trắc nghiệm': 'Chọn đáp án đúng.',
  'Hoàn thành câu': 'Chọn đáp án đúng để hoàn thành câu.',
  'Giới từ': 'Chọn giới từ đúng để hoàn thành câu.',
  'Phát âm khác': 'Chọn từ có phần âm khác các từ còn lại.',
};

const QUIZ_TYPE_INSTRUCTIONS_VI: Record<string, string> = {
  fill_blank: 'Điền từ thích hợp vào chỗ trống.',
  word_form: 'Cho dạng đúng của từ để hoàn thành câu.',
  multiple_choice: 'Chọn đáp án đúng.',
};

const QUIZ_ERROR_UNDERLINE_TAG_RE =
  /<u\b[^>]*class=(['"])[^'"]*\bquiz-error-opt\b[^'"]*\1[^>]*>([\s\S]*?)<\/u>/gi;
const VOWEL_CLUSTER_RE = /[aeiouy]+/i;

export const GRAMMAR_FILL_INSTRUCTION_VI =
  'Chọn từ trong gợi ý và điền vào chỗ trống.';

export function isWorkbookExerciseCode(value: string | null | undefined): boolean {
  return EXERCISE_CODE_RE.test(String(value || '').trim());
}

/** Remove trailing workbook annotations like "(Ex 13)". */
export function stripExerciseAnnotation(value: string | null | undefined): string {
  return String(value || '').replace(EXERCISE_ANNOTATION_RE, '').trim();
}

/** Prefer typeLabel when the stored exercise key is a workbook code; strip (Ex N). */
export function quizExerciseDisplayTitle(
  exercise: string | null | undefined,
  typeLabel: string | null | undefined
): string {
  const code = stripExerciseAnnotation(exercise);
  const label = String(typeLabel || '').trim();
  if (isWorkbookExerciseCode(code) && label) return label;
  return code || label || 'Bài tập';
}

/**
 * Split reading-comprehension payloads of the form `passage\\n\\nstem`.
 * Only splits when the leading block looks like a real passage.
 */
export function splitQuizPassageAndStem(raw: string | null | undefined): {
  passage: string;
  stem: string;
} {
  const text = String(raw || '');
  const normalized = text.replace(/<br\s*\/?>/gi, '\n').trim();
  if (!normalized) return { passage: '', stem: '' };

  const parts = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const passage = parts.slice(0, -1).join('\n\n');
    const stem = parts[parts.length - 1] || '';
    const plainPassage = passage.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainPassage.length >= 80) {
      return { passage, stem };
    }
  }

  return { passage: '', stem: text };
}

export function quizExerciseInstructionVi(
  typeLabel: string | null | undefined,
  type?: string | null,
  exercise?: string | null,
  question?: string | null
): string {
  if (isPronunciationDifferenceQuiz(typeLabel, exercise, question)) {
    return 'Chọn từ có phần phát âm khác các từ còn lại.';
  }
  const label = String(typeLabel || '').trim();
  if (label && TYPE_LABEL_INSTRUCTIONS_VI[label]) {
    return TYPE_LABEL_INSTRUCTIONS_VI[label];
  }
  const t = String(type || '').trim();
  if (t && QUIZ_TYPE_INSTRUCTIONS_VI[t]) {
    return QUIZ_TYPE_INSTRUCTIONS_VI[t];
  }
  return 'Đọc câu hỏi và nhập / chọn đáp án đúng.';
}

export function isPronunciationDifferenceQuiz(
  typeLabel?: string | null,
  exercise?: string | null,
  question?: string | null
): boolean {
  const blob = `${typeLabel || ''} ${exercise || ''} ${question || ''}`.toLowerCase();
  return (
    blob.includes('phát âm khác') ||
    blob.includes('different underlined sound') ||
    blob.includes('pronounced differently') ||
    blob.includes('phần nguyên âm / âm khác')
  );
}

export function isFindTheMistakeQuiz(
  typeLabel?: string | null,
  exercise?: string | null,
  question?: string | null
): boolean {
  if (isPronunciationDifferenceQuiz(typeLabel, exercise, question)) {
    return false;
  }
  const blob = `${typeLabel || ''} ${exercise || ''}`.toLowerCase();
  return (
    blob.includes('tìm lỗi sai') ||
    blob.includes('find the mistake') ||
    blob.includes('needs correcting') ||
    blob.includes('underlined part')
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip every HTML tag (keep text only). */
export function stripHtmlTags(value: string | null | undefined): string {
  return String(value || '').replace(/<[^>]+>/g, '');
}

const QUIZ_ALLOWED_TAGS = new Set(['u', 'b', 'i', 'em', 'strong', 'br']);
const QUIZ_ALLOWED_CLASSES = new Set(['quiz-error-opt']);

/**
 * Allowlist safe formatting tags used in quiz/grammar content.
 * Rebuilds tags so scripts / on* / href cannot sneak through.
 */
export function sanitizeQuizHtml(html: string | null | undefined): string {
  const raw = String(html || '');
  if (!raw) return '';

  // Drop dangerous elements and their contents entirely.
  const withoutBlocked = raw.replace(
    /<\/?(?:script|style|iframe|object|embed|link|meta|svg)\b[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|svg)>/gi,
    '',
  ).replace(/<\/?(?:script|style|iframe|object|embed|link|meta|svg)\b[^>]*>/gi, '');

  return withoutBlocked.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, tagName, attrs) => {
    const tag = String(tagName).toLowerCase();
    if (!QUIZ_ALLOWED_TAGS.has(tag)) return '';
    if (full.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br />';

    const classMatch = /\bclass\s*=\s*(["'])(.*?)\1/i.exec(String(attrs || ''));
    const classes = (classMatch?.[2] || '')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => QUIZ_ALLOWED_CLASSES.has(part));
    if (classes.length > 0) {
      return `<${tag} class="${classes.join(' ')}">`;
    }
    return `<${tag}>`;
  });
}

const KNOWN_ERROR_OPTION_FIXES: Record<string, string> = {
  rêpating: 'repeating',
  repating: 'repeating',
};

function foldAscii(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Align a corrupted option (Telex / truncation) to the span in the sentence. */
export function repairErrorOption(
  sentence: string,
  option: string,
  cursor = 0
): { text: string; index: number } {
  const plain = sentence;
  const opt = (KNOWN_ERROR_OPTION_FIXES[option] || option).trim();
  if (!opt) return { text: option, index: -1 };

  // Whole-word / phrase match first (avoid "th" matching inside "the").
  const boundary = new RegExp(
    `(?<![A-Za-z'])${opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z'])`,
    'i'
  );
  boundary.lastIndex = cursor;
  const exact = boundary.exec(plain);
  if (exact && exact.index >= cursor) {
    return { text: plain.slice(exact.index, exact.index + exact[0].length), index: exact.index };
  }

  const foldedOpt = foldAscii(opt);
  const search = plain.slice(cursor);
  const wordRe = /[A-Za-z']+/g;
  const words: Array<{ start: number; end: number; word: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = wordRe.exec(search))) {
    words.push({ start: match.index, end: match.index + match[0].length, word: match[0] });
  }

  for (let startI = 0; startI < words.length; startI += 1) {
    for (let endI = startI; endI < Math.min(startI + 4, words.length); endI += 1) {
      const span = search.slice(words[startI].start, words[endI].end);
      if (foldAscii(span) === foldedOpt) {
        const abs = cursor + words[startI].start;
        return { text: plain.slice(abs, cursor + words[endI].end), index: abs };
      }
    }
  }

  for (const word of words) {
    if (word.word.toLowerCase().startsWith(opt.toLowerCase()) && word.word.length > opt.length) {
      const abs = cursor + word.start;
      return { text: word.word, index: abs };
    }
  }

  return { text: option, index: -1 };
}

export function repairErrorOptions(sentence: string, options: string[]): string[] {
  let cursor = 0;
  return options.map((option) => {
    const repaired = repairErrorOption(sentence, option, cursor);
    if (repaired.index >= 0) cursor = repaired.index + repaired.text.length;
    return repaired.text;
  });
}

function inferPronunciationSegment(options: string[]): string {
  const normalized = options
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  if (normalized.length < 2) return '';

  const shortest = [...normalized].sort((a, b) => a.length - b.length)[0] || '';
  let best = '';

  for (let start = 0; start < shortest.length; start += 1) {
    for (let end = start + 1; end <= shortest.length; end += 1) {
      const candidate = shortest.slice(start, end);
      if (candidate.length < best.length) continue;
      if (!VOWEL_CLUSTER_RE.test(candidate)) continue;
      if (normalized.every((word) => word.includes(candidate))) {
        best = candidate;
      }
    }
  }

  return best;
}

function underlinePronunciationOption(option: string, segment: string): string {
  const plain = stripHtmlTags(option).trim();
  if (!segment) return escapeHtml(plain);
  const lower = plain.toLowerCase();
  const index = lower.indexOf(segment.toLowerCase());
  if (index < 0) return escapeHtml(plain);
  return [
    escapeHtml(plain.slice(0, index)),
    `<u class="quiz-error-opt">${escapeHtml(plain.slice(index, index + segment.length))}</u>`,
    escapeHtml(plain.slice(index + segment.length)),
  ].join('');
}

export function underlinePronunciationOptionsInQuestion(
  question: string | null | undefined,
  options: string[] | null | undefined
): string {
  const plain = stripHtmlTags(question).trim();
  // Options in seed data may already contain <u>…</u>; strip before rebuild
  // so escapeHtml does not turn them into literal "&lt;u&gt;".
  const opts = (options || [])
    .map((item) => stripHtmlTags(item).trim())
    .filter(Boolean);
  if (!plain) return '';
  if (opts.length === 0) return escapeHtml(plain).replace(/\n/g, '<br />');

  const segment = inferPronunciationSegment(opts);
  const renderedOptions = opts.map((option) => underlinePronunciationOption(option, segment));
  const colonIndex = plain.indexOf(':');
  const prefix = colonIndex >= 0 ? plain.slice(0, colonIndex + 1).trim() : '';
  const rendered = prefix ? `${escapeHtml(prefix)} ${renderedOptions.join(' / ')}` : renderedOptions.join(' / ');
  return sanitizeQuizHtml(rendered.replace(/\n/g, '<br />'));
}

export function normalizeQuizQuestionHtml(
  html: string | null | undefined,
  typeLabel?: string | null,
  exercise?: string | null,
  question?: string | null,
  options?: string[] | null
): string {
  const raw = String(html || '');
  if (!raw) return '';
  if (!isPronunciationDifferenceQuiz(typeLabel, exercise, question || raw)) {
    return sanitizeQuizHtml(raw.includes('<') ? raw : raw.replace(/\n/g, '<br />'));
  }
  const plain = raw.replace(QUIZ_ERROR_UNDERLINE_TAG_RE, '$2');
  return underlinePronunciationOptionsInQuestion(plain, options);
}

/**
 * Underline A/B/C/D error segments inside the sentence, in order of appearance
 * (same layout as workbook “Choose the underlined part…”).
 */
export function underlineErrorOptionsInSentence(
  sentence: string | null | undefined,
  options: string[] | null | undefined
): string {
  const raw = String(sentence || '');
  if (!raw.trim()) return '';

  const plain = stripHtmlTags(sentence);
  const opts = (options || []).map((item) => stripHtmlTags(item).trim()).filter(Boolean);
  if (opts.length === 0) return escapeHtml(plain);

  let cursor = 0;
  let out = '';
  for (const opt of opts) {
    const repaired = repairErrorOption(plain, opt, cursor);
    if (repaired.index < 0) continue;
    out += escapeHtml(plain.slice(cursor, repaired.index));
    out += `<u class="quiz-error-opt">${escapeHtml(repaired.text)}</u>`;
    cursor = repaired.index + repaired.text.length;
  }
  out += escapeHtml(plain.slice(cursor));
  return sanitizeQuizHtml(out);
}
