import type { AdminGameKey } from './payloadSchemas';
import { EXERCISE_GAMES } from './payloadSchemas';

export type SheetColumn = {
  key: string;
  label: string;
  width?: string;
  kind?: 'text' | 'textarea' | 'select' | 'checkbox';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Maps to payload field; special: sortOrder, externalId, active */
  source: 'payload' | 'meta';
};

const META_COLS: SheetColumn[] = [
  {
    key: 'sortOrder',
    label: 'Thứ tự',
    width: '72px',
    kind: 'text',
    source: 'meta',
    placeholder: '1',
  },
  {
    key: 'externalId',
    label: 'Mã',
    width: '88px',
    kind: 'text',
    source: 'meta',
    placeholder: 'ID',
  },
];

const ACTIVE_COL: SheetColumn = {
  key: 'active',
  label: 'Dùng',
  width: '64px',
  kind: 'checkbox',
  source: 'meta',
};

export function sheetColumnsForGame(game: string): SheetColumn[] {
  if (game === 'grammar') {
    return [
      ...META_COLS,
      { key: 'prefix', label: 'Trước chỗ trống', source: 'payload', placeholder: 'She' },
      { key: 'suffix', label: 'Sau chỗ trống', source: 'payload', placeholder: 'to school.' },
      { key: 'hint', label: 'Gợi ý', width: '140px', source: 'payload' },
      {
        key: 'answers',
        label: 'Đáp án (| )',
        source: 'payload',
        placeholder: 'goes|go',
      },
      { key: 'source', label: 'Câu gốc', source: 'payload' },
      ACTIVE_COL,
    ];
  }

  if (game === 'quiz') {
    return [
      ...META_COLS,
      {
        key: 'type',
        label: 'Loại',
        width: '130px',
        kind: 'select',
        source: 'payload',
        options: [
          { value: 'multiple_choice', label: 'Trắc nghiệm' },
          { value: 'fill_blank', label: 'Điền từ' },
          { value: 'word_form', label: 'Từ loại' },
        ],
      },
      {
        key: 'skill',
        label: 'Kỹ năng',
        width: '120px',
        kind: 'select',
        source: 'payload',
        options: [
          { value: 'listening', label: 'Nghe' },
          { value: 'reading', label: 'Đọc' },
          { value: 'speaking', label: 'Nói' },
          { value: 'writing', label: 'Viết' },
          { value: 'vocabulary', label: 'Từ vựng' },
        ],
      },
      { key: 'exercise', label: 'Exercise', width: '120px', source: 'payload', placeholder: 'Exercise 2' },
      { key: 'question', label: 'Câu hỏi', source: 'payload', kind: 'textarea' },
      {
        key: 'options',
        label: 'Lựa chọn (| )',
        source: 'payload',
        placeholder: 'a|b|c|d',
      },
      { key: 'answer', label: 'Đáp án', width: '120px', source: 'payload' },
      { key: 'accept', label: 'Chấp nhận thêm (| )', source: 'payload' },
      ACTIVE_COL,
    ];
  }

  if (game === 'pronunciation') {
    return [
      ...META_COLS,
      {
        key: 'mode',
        label: 'Chế độ',
        width: '120px',
        kind: 'select',
        source: 'payload',
        options: [
          { value: 'phoneme', label: 'Âm' },
          { value: 'word', label: 'Từ' },
          { value: 'sentence', label: 'Câu' },
        ],
      },
      { key: 'prompt', label: 'Hướng dẫn', source: 'payload' },
      { key: 'targetText', label: 'Nội dung đọc', source: 'payload' },
      { key: 'targetIpa', label: 'IPA', width: '110px', source: 'payload' },
      { key: 'hint', label: 'Gợi ý', source: 'payload' },
      { key: 'referenceAudioUrl', label: 'Link audio', source: 'payload' },
      ACTIVE_COL,
    ];
  }

  if (game === 'scramble' || game === 'word_match') {
    return [
      ...META_COLS,
      { key: 'word', label: 'Từ', source: 'payload' },
      { key: 'hint', label: 'Gợi ý', source: 'payload' },
      { key: 'image', label: 'Link hình', source: 'payload' },
      ACTIVE_COL,
    ];
  }

  const exerciseCols: SheetColumn[] = [
    ...META_COLS,
    { key: 'title', label: 'Tiêu đề bài', source: 'payload' },
    { key: 'instruction', label: 'Hướng dẫn', source: 'payload' },
  ];

  if (
    game === 'look_and_write' ||
    game === 'read_and_complete' ||
    game === 'vocabulary_test'
  ) {
    exerciseCols.push({
      key: 'word_bank',
      label: 'Hộp từ (| )',
      source: 'payload',
      placeholder: 'cat|dog|bird',
    });
  }

  exerciseCols.push(ACTIVE_COL);
  return exerciseCols;
}

export function isExerciseGame(game: string): game is AdminGameKey {
  return EXERCISE_GAMES.has(game as AdminGameKey);
}

export function pipeJoin(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean).join('|');
  }
  return String(value ?? '');
}

export function pipeSplit(value: string): string[] {
  return value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

export type SheetRowState = {
  /** client key; new rows use temp- */
  key: string;
  id: string | null;
  sortOrder: number;
  externalId: string;
  active: boolean;
  dirty: boolean;
  saving: boolean;
  error: string;
  /** flat editable values for columns */
  values: Record<string, string | boolean>;
  /** full items array for exercise games */
  items: Array<Record<string, string | boolean | number>>;
  expanded: boolean;
};

export function payloadToValues(
  game: string,
  payload: Record<string, unknown>
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const col of sheetColumnsForGame(game)) {
    if (col.source !== 'payload') continue;
    const raw = payload[col.key];
    if (col.key === 'answers' || col.key === 'options' || col.key === 'accept' || col.key === 'word_bank') {
      values[col.key] = pipeJoin(raw);
    } else if (typeof raw === 'boolean') {
      values[col.key] = raw;
    } else {
      values[col.key] = String(raw ?? '');
    }
  }
  return values;
}

export function valuesToPayload(
  game: string,
  values: Record<string, string | boolean>,
  items: Array<Record<string, string | boolean | number>>
): Record<string, unknown> {
  if (game === 'grammar') {
    return {
      source: String(values.source || ''),
      prefix: String(values.prefix || ''),
      suffix: String(values.suffix || ''),
      hint: String(values.hint || ''),
      answers: pipeSplit(String(values.answers || '')),
    };
  }
  if (game === 'quiz') {
    const type = String(values.type || 'multiple_choice');
    const answer = String(values.answer || '');
    const accept = pipeSplit(String(values.accept || ''));
    return {
      type,
      typeLabel: '',
      skill: String(values.skill || 'vocabulary'),
      exercise: String(values.exercise || '').trim(),
      question: String(values.question || ''),
      answer,
      options: pipeSplit(String(values.options || '')),
      accept: accept.length ? accept : answer ? [answer] : [],
      fillMode: type === 'fill_blank' || type === 'word_form',
    };
  }
  if (game === 'pronunciation') {
    const mode = String(values.mode || 'phoneme');
    return {
      mode,
      modeLabel: mode === 'sentence' ? 'Luyện câu' : mode === 'word' ? 'Luyện từ' : 'Luyện âm',
      prompt: String(values.prompt || ''),
      targetText: String(values.targetText || ''),
      targetIpa: String(values.targetIpa || ''),
      referenceAudioUrl: String(values.referenceAudioUrl || ''),
      hint: String(values.hint || ''),
    };
  }
  if (game === 'scramble' || game === 'word_match') {
    return {
      word: String(values.word || ''),
      hint: String(values.hint || ''),
      image: String(values.image || ''),
    };
  }

  const base: Record<string, unknown> = {
    title: String(values.title || ''),
    instruction: String(values.instruction || ''),
    items: items.map((item, index) => ({
      ...item,
      order: index + 1,
    })),
  };

  if (game === 'look_and_write' || game === 'read_and_complete' || game === 'vocabulary_test') {
    base.word_bank = pipeSplit(String(values.word_bank || ''));
  }

  return base;
}

export function defaultItemForGame(game: string): Record<string, string | boolean | number> {
  if (game === 'choose_and_circle') {
    return { order: 1, image: '', prompt: '', optionA: '', optionB: '', answer: '' };
  }
  if (game === 'read_and_complete') {
    return { order: 1, sentence: '', image: '', answer: '' };
  }
  if (game === 'read_and_match') {
    return { order: 1, sentence: '', image: '', label: '', answer: '' };
  }
  if (game === 'vocabulary_check') {
    return { order: 1, image: '', word: '', sentence: '', is_correct: true };
  }
  return { order: 1, image: '', answer: '' };
}

export function normalizeItemsFromPayload(
  game: string,
  payload: Record<string, unknown>
): Array<Record<string, string | boolean | number>> {
  const raw = Array.isArray(payload.items) ? payload.items : [];
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') return defaultItemForGame(game);
    const row = item as Record<string, unknown>;
    if (game === 'choose_and_circle') {
      const options = Array.isArray(row.options) ? row.options : [];
      return {
        order: index + 1,
        image: String(row.image || ''),
        prompt: String(row.prompt || ''),
        optionA: String(options[0] || ''),
        optionB: String(options[1] || ''),
        answer: String(row.answer || ''),
      };
    }
    if (game === 'vocabulary_check') {
      return {
        order: index + 1,
        image: String(row.image || ''),
        word: String(row.word || ''),
        sentence: String(row.sentence || ''),
        is_correct: Boolean(row.is_correct),
      };
    }
    return {
      order: index + 1,
      image: String(row.image || ''),
      answer: String(row.answer || ''),
      sentence: String(row.sentence || ''),
      label: String(row.label || ''),
      word: String(row.word || ''),
    };
  });
}

export function serializeItemsForPayload(
  game: string,
  items: Array<Record<string, string | boolean | number>>
): Array<Record<string, unknown>> {
  return items.map((item, index) => {
    if (game === 'choose_and_circle') {
      return {
        order: index + 1,
        image: String(item.image || ''),
        prompt: String(item.prompt || ''),
        options: [String(item.optionA || ''), String(item.optionB || '')],
        answer: String(item.answer || ''),
      };
    }
    if (game === 'read_and_complete') {
      return {
        order: index + 1,
        sentence: String(item.sentence || ''),
        image: String(item.image || ''),
        answer: String(item.answer || ''),
      };
    }
    if (game === 'read_and_match') {
      return {
        order: index + 1,
        sentence: String(item.sentence || ''),
        image: String(item.image || ''),
        label: String(item.label || ''),
        answer: String(item.answer || ''),
      };
    }
    if (game === 'vocabulary_check') {
      return {
        order: index + 1,
        image: String(item.image || ''),
        word: String(item.word || ''),
        sentence: String(item.sentence || ''),
        is_correct: Boolean(item.is_correct),
      };
    }
    return {
      order: index + 1,
      image: String(item.image || ''),
      answer: String(item.answer || ''),
    };
  });
}

export function emptySheetRow(
  game: string,
  sortOrder: number,
  externalId = ''
): SheetRowState {
  const values = payloadToValues(game, {});
  if (game === 'quiz') {
    values.type = 'multiple_choice';
    values.skill = 'vocabulary';
  }
  if (game === 'pronunciation') values.mode = 'phoneme';
  return {
    key: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    sortOrder,
    externalId,
    active: true,
    dirty: true,
    saving: false,
    error: '',
    values,
    items: isExerciseGame(game) ? [defaultItemForGame(game)] : [],
    expanded: isExerciseGame(game),
  };
}

/** Next sequential Mã / # from existing rows (numeric externalId + sortOrder). */
export function nextSheetSequence(
  rows: Array<{ externalId?: string; sortOrder?: number }>
): number {
  let max = 0;
  for (const row of rows) {
    const fromId = Number(String(row.externalId || '').trim());
    if (Number.isFinite(fromId) && fromId > max) max = fromId;
    const fromOrder = Number(row.sortOrder || 0);
    if (Number.isFinite(fromOrder) && fromOrder > max) max = fromOrder;
  }
  if (rows.length > max) max = rows.length;
  return max + 1;
}

export function questionToSheetRow(
  game: string,
  question: {
    id: string;
    sortOrder: number;
    externalId: string | null;
    active: boolean;
    payload: unknown;
  }
): SheetRowState {
  const payload =
    question.payload && typeof question.payload === 'object' && !Array.isArray(question.payload)
      ? (question.payload as Record<string, unknown>)
      : {};
  return {
    key: question.id,
    id: question.id,
    sortOrder: question.sortOrder || 0,
    externalId: question.externalId || '',
    active: question.active,
    dirty: false,
    saving: false,
    error: '',
    values: payloadToValues(game, payload),
    items: isExerciseGame(game) ? normalizeItemsFromPayload(game, payload) : [],
    expanded: false,
  };
}

export function itemColumnsForGame(game: string): SheetColumn[] {
  if (game === 'choose_and_circle') {
    return [
      { key: 'prompt', label: 'Câu / đề', source: 'payload' },
      { key: 'image', label: 'Link hình', source: 'payload' },
      { key: 'optionA', label: 'Lựa chọn A', source: 'payload' },
      { key: 'optionB', label: 'Lựa chọn B', source: 'payload' },
      { key: 'answer', label: 'Đáp án', source: 'payload' },
    ];
  }
  if (game === 'read_and_complete') {
    return [
      { key: 'sentence', label: 'Câu (___ )', source: 'payload' },
      { key: 'answer', label: 'Đáp án', source: 'payload' },
      { key: 'image', label: 'Link hình', source: 'payload' },
    ];
  }
  if (game === 'read_and_match') {
    return [
      { key: 'sentence', label: 'Câu', source: 'payload' },
      { key: 'image', label: 'Link hình', source: 'payload' },
      { key: 'label', label: 'Nhãn', width: '72px', source: 'payload' },
      { key: 'answer', label: 'Đáp án', width: '72px', source: 'payload' },
    ];
  }
  if (game === 'vocabulary_check') {
    return [
      { key: 'image', label: 'Link hình', source: 'payload' },
      { key: 'word', label: 'Từ', source: 'payload' },
      { key: 'sentence', label: 'Câu mô tả', source: 'payload' },
      {
        key: 'is_correct',
        label: 'Đúng?',
        width: '88px',
        kind: 'select',
        source: 'payload',
        options: [
          { value: 'true', label: 'Đúng' },
          { value: 'false', label: 'Sai' },
        ],
      },
    ];
  }
  return [
    { key: 'image', label: 'Link hình', source: 'payload' },
    { key: 'answer', label: 'Đáp án', source: 'payload' },
  ];
}
