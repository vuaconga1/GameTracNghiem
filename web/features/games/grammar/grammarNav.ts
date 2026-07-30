import { completedCountForIndices } from '@/lib/pronunciationExercises';
import { isWorkbookExerciseCode } from '@/features/games/exerciseDisplay';

export const DEFAULT_GRAMMAR_EXERCISE = 'Ngữ pháp';
export const DEFAULT_GRAMMAR_WORKING_SET = 'Bài tập viết';

const WRITING_EXERCISE_RE = /^W\s+Exercise\s+(\d+)$/i;

export type GrammarExerciseGroup = {
  key: string;
  label: string;
  indices: number[];
  questionCount: number;
};

export type GrammarQuestionLike = {
  hint?: string | null;
  source?: string | null;
  prefix?: string | null;
  suffix?: string | null;
};

export type GrammarPromptMode =
  | 'fill_blank'
  | 'rewrite_with_prompt'
  | 'reorder_words'
  | 'double_comparative'
  | 'present_perfect'
  | 'correct_mistake';

export type GrammarQuestionDisplayMeta = {
  mode: GrammarPromptMode;
  title: string;
  instruction: string;
  sourceLabel: string;
  answerLabel: string;
  helperText: string;
};

const REORDER_TOKEN_RE = /\//g;
/** Already-formed comparative chunks in a scramble (word-order of a double comparative). */
const COMPARATIVE_MARKER_RE = /\bthe\s+(more|less|[a-z]+er)\b/i;
/** Present-perfect time / form cues in guided slash prompts (not finished have/has bags). */
const PRESENT_PERFECT_CUE_RE =
  /\b(already|yet|ever|recently|since|just|lately|never|tobe)\b/i;
/** Auxiliaries that mean the slash bag is already a present-perfect scramble. */
const PRESENT_PERFECT_AUX_RE = /\b(have|has|haven't|hasn't|havent|hasnt)\b/i;
/** Past-narrative cues (e.g. past continuous guided writing). */
const PAST_NARRATIVE_CUE_RE = /\b(while|yesterday|last|ago|all day|all morning|all year|all month)\b/i;
/** Catenative verbs typical of gerund/infinitive guided prompts. */
const CATENATIVE_VERB_RE =
  /\b(mind|plan|promise|need|fancy|agree|want|learn|prefer|enjoy|avoid|consider|decide|hope|offer|refuse|manage|expect)\b/i;

export function normalizeGrammarExercise(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw || DEFAULT_GRAMMAR_EXERCISE;
}

function isWritingExerciseCode(value: string | null | undefined): boolean {
  return WRITING_EXERCISE_RE.test(String(value || '').trim());
}

function hasPromptParts(question: GrammarQuestionLike | null | undefined): boolean {
  return Boolean(String(question?.prefix || '').trim() || String(question?.suffix || '').trim());
}

function slashTokens(source: string): string[] {
  return source
    .split('/')
    .map((token) => token.trim())
    .filter(Boolean);
}

function looksLikeReorderWords(source: string): boolean {
  return (source.match(REORDER_TOKEN_RE) || []).length >= 3;
}

/**
 * Sparse slash cues for writing double comparatives (e.g. `modern/ car/ be,/ expensive/ it/ cost`),
 * not long word-order bags and not scrambles that already include "The more / The -er".
 */
export function looksLikeDoubleComparative(source: string): boolean {
  if (!looksLikeReorderWords(source)) return false;
  const tokens = slashTokens(source);
  if (tokens.length < 4 || tokens.length > 9) return false;
  const plain = tokens.join(' ');
  if (COMPARATIVE_MARKER_RE.test(plain)) return false;
  if (/\bIf\b/i.test(plain)) return false;
  // Clause-split cue before the final token (e.g. `be,` or `be, comfortable`).
  const beforeLast = tokens.slice(0, -1).join(' ');
  return /,/.test(beforeLast);
}

/**
 * Guided present-perfect writing with slash cues (e.g. `I/ already/ speak/ / the manager/ the issue./`),
 * not true word-order bags that already include have/has, and not double-comparative cues.
 */
export function looksLikePresentPerfect(source: string): boolean {
  if (!looksLikeReorderWords(source)) return false;
  if (looksLikeDoubleComparative(source)) return false;
  const tokens = slashTokens(source);
  const plain = tokens.join(' ');
  // Finished present-perfect scrambles keep have/has in the bag.
  if (PRESENT_PERFECT_AUX_RE.test(plain)) return false;
  if (PRESENT_PERFECT_CUE_RE.test(plain)) return true;
  // Negative guided prompts without auxiliaries: `She/ not/ achieve/ goals/ despite/ efforts.`
  if (!/\bnot\b/i.test(plain)) return false;
  if (PAST_NARRATIVE_CUE_RE.test(plain)) return false;
  if (/\(\s*(should|must|might|may|can)\s*\)/i.test(source)) return false;
  if (CATENATIVE_VERB_RE.test(plain)) return false;
  if (/\bIf\b/i.test(plain)) return false;
  return tokens.length >= 4 && tokens.length <= 10;
}

export function grammarQuestionDisplayMeta(
  question: GrammarQuestionLike | null | undefined
): GrammarQuestionDisplayMeta {
  const source = String(question?.source || '').trim();
  const hint = String(question?.hint || '').trim();
  const hasPrompt = hasPromptParts(question);
  const workbookFill = isWorkbookExerciseCode(source) || (!source && !hasPrompt);

  if (workbookFill) {
    return {
      mode: 'fill_blank',
      title: 'Điền từ vào chỗ trống',
      instruction: 'Chọn từ trong gợi ý và điền vào chỗ trống.',
      sourceLabel: '',
      answerLabel: 'Điền từ vào chỗ trống:',
      helperText: '',
    };
  }

  if (hasPrompt) {
    return {
      mode: 'rewrite_with_prompt',
      title: 'Viết lại câu theo từ gợi ý',
      instruction:
        'Đọc câu gốc rồi viết phần còn thiếu để hoàn thành câu mới đúng ngữ pháp và đúng nghĩa.',
      sourceLabel: 'Câu gốc',
      answerLabel: 'Viết phần còn thiếu:',
      helperText: isWritingExerciseCode(hint)
        ? 'Giữ nguyên phần đã cho và chỉ điền đoạn còn thiếu vào ô trả lời.'
        : hint,
    };
  }

  if (looksLikeDoubleComparative(source)) {
    return {
      mode: 'double_comparative',
      title: 'Viết lại câu theo dạng so sánh kép',
      instruction:
        'Dùng các từ gợi ý để viết câu theo cấu trúc so sánh kép (The more/less/-er ..., the more/less/-er ...).',
      sourceLabel: 'Từ/cụm từ gợi ý',
      answerLabel: 'Viết câu so sánh kép:',
      helperText: isWritingExerciseCode(hint)
        ? 'Viết đầy đủ câu dạng "The ..., the ..." và thêm dấu câu phù hợp.'
        : hint,
    };
  }

  if (looksLikePresentPerfect(source)) {
    return {
      mode: 'present_perfect',
      title: 'Viết câu dùng thì hiện tại hoàn thành',
      instruction:
        'Dùng các từ gợi ý để viết câu đúng với thì hiện tại hoàn thành (present perfect).',
      sourceLabel: 'Từ/cụm từ gợi ý',
      answerLabel: 'Viết câu hiện tại hoàn thành:',
      helperText: isWritingExerciseCode(hint)
        ? 'Chia động từ ở thì hiện tại hoàn thành và bổ sung từ cần thiết (have/has, giới từ, mạo từ…).'
        : hint,
    };
  }

  if (looksLikeReorderWords(source)) {
    return {
      mode: 'reorder_words',
      title: 'Sắp xếp từ thành câu hoàn chỉnh',
      instruction: 'Sắp xếp các từ hoặc cụm từ đã cho để viết thành câu hoàn chỉnh.',
      sourceLabel: 'Từ/cụm từ đã cho',
      answerLabel: 'Viết câu hoàn chỉnh:',
      helperText: isWritingExerciseCode(hint)
        ? 'Viết lại thành một câu đúng thứ tự và thêm dấu câu phù hợp.'
        : hint,
    };
  }

  return {
    mode: 'correct_mistake',
    title: 'Tìm và sửa lỗi sai trong câu',
    instruction: 'Đọc câu, tìm lỗi sai rồi viết lại cả câu cho đúng.',
    sourceLabel: 'Câu có lỗi',
    answerLabel: 'Viết lại câu đúng:',
    helperText: isWritingExerciseCode(hint)
      ? 'Hãy sửa lỗi ngữ pháp hoặc dùng từ rồi viết lại toàn bộ câu.'
      : hint,
  };
}

export function grammarExerciseDisplayTitle(
  value: string | null | undefined,
  sampleQuestion?: GrammarQuestionLike | null
): string {
  const label = normalizeGrammarExercise(value);
  if (isWritingExerciseCode(label)) {
    return sampleQuestion ? grammarQuestionDisplayMeta(sampleQuestion).title : DEFAULT_GRAMMAR_WORKING_SET;
  }
  return label;
}

export function groupGrammarExercises(
  questions: GrammarQuestionLike[],
): GrammarExerciseGroup[] {
  const order: string[] = [];
  const groups = new Map<string, GrammarExerciseGroup>();

  questions.forEach((question, index) => {
    const label = normalizeGrammarExercise(question.hint);
    const existing = groups.get(label);
    if (existing) {
      existing.indices.push(index);
      existing.questionCount += 1;
      return;
    }
    order.push(label);
    groups.set(label, {
      key: label,
      label: grammarExerciseDisplayTitle(label, question),
      indices: [index],
      questionCount: 1,
    });
  });

  return order.map((key) => groups.get(key)!);
}

export function filterGrammarQuestionsByExercise<T extends { hint?: string | null }>(
  questions: T[],
  exercise: string | null | undefined,
): Array<{ question: T; index: number }> {
  if (!exercise) {
    return questions.map((question, index) => ({ question, index }));
  }
  const wanted = normalizeGrammarExercise(exercise);
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => normalizeGrammarExercise(question.hint) === wanted);
}

export { completedCountForIndices };
