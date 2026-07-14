import { EXERCISE_GAMES } from '@/lib/admin/payloadSchemas';
import { mediaKindFromFilename, normalizeMediaKey } from '@/lib/media/normalizeMediaKey';

export type AttachQuestion = { id: string; payload: Record<string, unknown> };

export type AttachAction =
  | {
      type: 'attach';
      questionId: string;
      itemIndex?: number;
      key: string;
      field: 'image' | 'referenceAudioUrl';
      filename: string;
    }
  | { type: 'skipped_filled'; key: string; filename: string; questionId: string; itemIndex?: number }
  | {
      type: 'unmatched';
      filename: string;
      reason:
        | 'no_match'
        | 'wrong_kind'
        | 'ambiguous_question'
        | 'ambiguous_file'
        | 'unsupported_game';
    };

const SCALAR_IMAGE_GAMES = new Set(['scramble', 'word_match']);

type ItemTarget = { questionId: string; itemIndex: number; key: string; image: string };

function scalarMatchField(game: string): 'word' | 'targetText' | null {
  if (game === 'scramble' || game === 'word_match') return 'word';
  if (game === 'pronunciation') return 'targetText';
  return null;
}

function scalarMediaField(game: string, kind: 'image' | 'audio'): 'image' | 'referenceAudioUrl' | null {
  if (SCALAR_IMAGE_GAMES.has(game) && kind === 'image') return 'image';
  if (game === 'pronunciation' && kind === 'audio') return 'referenceAudioUrl';
  return null;
}

function itemMatchKey(game: string, item: Record<string, unknown>): string {
  if (game === 'vocabulary_check') {
    return normalizeMediaKey(String(item.word ?? ''));
  }
  return normalizeMediaKey(String(item.answer ?? ''));
}

function collectItemTargets(game: string, questions: AttachQuestion[]): Map<string, ItemTarget[]> {
  const byKey = new Map<string, ItemTarget[]>();
  for (const q of questions) {
    const items = Array.isArray(q.payload.items) ? q.payload.items : [];
    items.forEach((raw, itemIndex) => {
      if (!raw || typeof raw !== 'object') return;
      const item = raw as Record<string, unknown>;
      const key = itemMatchKey(game, item);
      if (!key) return;
      const target: ItemTarget = {
        questionId: q.id,
        itemIndex,
        key,
        image: String(item.image ?? '').trim(),
      };
      const list = byKey.get(key) ?? [];
      list.push(target);
      byKey.set(key, list);
    });
  }
  return byKey;
}

function planScalarAttaches(input: {
  game: string;
  kind: 'image' | 'audio';
  questions: AttachQuestion[];
  filenames: string[];
}): AttachAction[] {
  const actions: AttachAction[] = [];
  const fieldKey = scalarMatchField(input.game);
  const writeField = scalarMediaField(input.game, input.kind);
  if (!fieldKey || !writeField) {
    for (const filename of input.filenames) {
      actions.push({ type: 'unmatched', filename, reason: 'wrong_kind' });
    }
    return actions;
  }

  const byKey = new Map<string, AttachQuestion[]>();
  for (const q of input.questions) {
    const raw = String(q.payload[fieldKey] ?? '');
    const key = normalizeMediaKey(raw);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(q);
    byKey.set(key, list);
  }

  return matchFilesToTargets(input.filenames, input.kind, byKey, (q) =>
    String(q.payload[writeField] ?? '').trim()
  ).map((action) => {
    if (action.type !== 'attach') return action;
    return { ...action, field: writeField };
  });
}

function planExerciseAttaches(input: {
  game: string;
  kind: 'image' | 'audio';
  questions: AttachQuestion[];
  filenames: string[];
}): AttachAction[] {
  if (input.kind !== 'image') {
    return input.filenames.map((filename) => ({
      type: 'unmatched' as const,
      filename,
      reason: 'wrong_kind' as const,
    }));
  }

  const byKey = collectItemTargets(input.game, input.questions);
  const actions: AttachAction[] = [];
  const filesByKey = new Map<string, string[]>();

  for (const filename of input.filenames) {
    const detected = mediaKindFromFilename(filename);
    if (detected !== 'image') {
      actions.push({
        type: 'unmatched',
        filename,
        reason: detected ? 'wrong_kind' : 'no_match',
      });
      continue;
    }
    const key = normalizeMediaKey(filename);
    const list = filesByKey.get(key) ?? [];
    list.push(filename);
    filesByKey.set(key, list);
  }

  for (const [key, filenames] of filesByKey) {
    if (filenames.length > 1) {
      for (const filename of filenames) {
        actions.push({ type: 'unmatched', filename, reason: 'ambiguous_file' });
      }
      continue;
    }
    const filename = filenames[0];
    const targets = byKey.get(key);
    if (!targets?.length) {
      actions.push({ type: 'unmatched', filename, reason: 'no_match' });
      continue;
    }
    if (targets.length > 1) {
      actions.push({ type: 'unmatched', filename, reason: 'ambiguous_question' });
      continue;
    }
    const target = targets[0];
    if (target.image) {
      actions.push({
        type: 'skipped_filled',
        key,
        filename,
        questionId: target.questionId,
        itemIndex: target.itemIndex,
      });
      continue;
    }
    actions.push({
      type: 'attach',
      questionId: target.questionId,
      itemIndex: target.itemIndex,
      key,
      field: 'image',
      filename,
    });
  }

  return actions;
}

function matchFilesToTargets<T extends { id: string }>(
  filenames: string[],
  kind: 'image' | 'audio',
  byKey: Map<string, T[]>,
  readCurrent: (target: T) => string
): AttachAction[] {
  const actions: AttachAction[] = [];
  const filesByKey = new Map<string, string[]>();

  for (const filename of filenames) {
    const detected = mediaKindFromFilename(filename);
    if (detected !== kind) {
      actions.push({
        type: 'unmatched',
        filename,
        reason: detected ? 'wrong_kind' : 'no_match',
      });
      continue;
    }
    const key = normalizeMediaKey(filename);
    const list = filesByKey.get(key) ?? [];
    list.push(filename);
    filesByKey.set(key, list);
  }

  for (const [key, names] of filesByKey) {
    if (names.length > 1) {
      for (const filename of names) {
        actions.push({ type: 'unmatched', filename, reason: 'ambiguous_file' });
      }
      continue;
    }
    const filename = names[0];
    const targets = byKey.get(key);
    if (!targets?.length) {
      actions.push({ type: 'unmatched', filename, reason: 'no_match' });
      continue;
    }
    if (targets.length > 1) {
      actions.push({ type: 'unmatched', filename, reason: 'ambiguous_question' });
      continue;
    }
    const target = targets[0];
    const current = readCurrent(target);
    if (current) {
      actions.push({
        type: 'skipped_filled',
        key,
        filename,
        questionId: target.id,
      });
      continue;
    }
    actions.push({
      type: 'attach',
      questionId: target.id,
      key,
      field: 'image',
      filename,
    });
  }

  return actions;
}

export function planMediaAttaches(input: {
  game: string;
  kind: 'image' | 'audio';
  questions: AttachQuestion[];
  filenames: string[];
}): { actions: AttachAction[] } {
  if (SCALAR_IMAGE_GAMES.has(input.game) || input.game === 'pronunciation') {
    return { actions: planScalarAttaches(input) };
  }
  if (EXERCISE_GAMES.has(input.game as never)) {
    return { actions: planExerciseAttaches(input) };
  }
  return {
    actions: input.filenames.map((filename) => ({
      type: 'unmatched' as const,
      filename,
      reason: 'unsupported_game' as const,
    })),
  };
}

export function applyAttachToPayload(
  payload: Record<string, unknown>,
  field: 'image' | 'referenceAudioUrl',
  url: string,
  itemIndex?: number
): Record<string, unknown> {
  if (itemIndex === undefined) {
    return { ...payload, [field]: url };
  }

  const items = Array.isArray(payload.items) ? [...payload.items] : [];
  const raw = items[itemIndex];
  if (!raw || typeof raw !== 'object') return payload;

  const nextItem: Record<string, unknown> = { ...(raw as Record<string, unknown>), [field]: url };
  if (field === 'image') {
    nextItem.hint_image = url;
  }
  items[itemIndex] = nextItem;
  return { ...payload, items };
}
