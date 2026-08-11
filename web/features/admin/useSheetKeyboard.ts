'use client';

import { useCallback, type KeyboardEvent } from 'react';

export type SheetNavAttrs = {
  'data-sheet-cell': true;
  'data-sheet-row': number;
  'data-sheet-col': number;
};

/** Attach to editable sheet cells for Excel-like navigation. */
export function sheetNav(row: number, col: number): SheetNavAttrs {
  return {
    'data-sheet-cell': true,
    'data-sheet-row': row,
    'data-sheet-col': col,
  };
}

function isTextLike(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || 'text').toLowerCase();
  return type === 'text' || type === 'password' || type === 'search' || type === 'number' || type === '';
}

function caretAtStart(el: HTMLInputElement | HTMLTextAreaElement) {
  return el.selectionStart === 0 && el.selectionEnd === 0;
}

function caretAtEnd(el: HTMLInputElement | HTMLTextAreaElement) {
  const len = el.value.length;
  return el.selectionStart === len && el.selectionEnd === len;
}

function focusSheetCell(root: Element, row: number, col: number): boolean {
  const el = root.querySelector(
    `[data-sheet-cell][data-sheet-row="${row}"][data-sheet-col="${col}"]`,
  ) as HTMLElement | null;
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.disabled || el.readOnly) return false;
  } else if (el instanceof HTMLSelectElement) {
    if (el.disabled) return false;
  }
  el.focus();
  if (isTextLike(el)) {
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      // number inputs may not support setSelectionRange
    }
  }
  return true;
}

function maxCoord(root: Element, attr: 'data-sheet-row' | 'data-sheet-col') {
  let max = -1;
  root.querySelectorAll(`[data-sheet-cell][${attr}]`).forEach((node) => {
    const n = Number(node.getAttribute(attr));
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max;
}

function tryMove(root: Element, row: number, col: number, dRow: number, dCol: number) {
  const maxRow = maxCoord(root, 'data-sheet-row');
  const maxCol = maxCoord(root, 'data-sheet-col');
  let r = row + dRow;
  let c = col + dCol;

  if (dCol !== 0) {
    while (c >= 0 && c <= maxCol) {
      if (focusSheetCell(root, r, c)) return true;
      c += dCol;
    }
    // wrap to next/prev row
    r += dCol > 0 ? 1 : -1;
    c = dCol > 0 ? 0 : maxCol;
    while (r >= 0 && r <= maxRow) {
      while (c >= 0 && c <= maxCol) {
        if (focusSheetCell(root, r, c)) return true;
        c += dCol > 0 ? 1 : -1;
      }
      r += dCol > 0 ? 1 : -1;
      c = dCol > 0 ? 0 : maxCol;
    }
    return false;
  }

  while (r >= 0 && r <= maxRow) {
    if (focusSheetCell(root, r, c)) return true;
    r += dRow;
  }
  return false;
}

/**
 * Excel-like keys inside [data-sheet-grid]:
 * - Tab / Shift+Tab: browser default (cell order)
 * - Enter: next row, same column (textarea: Ctrl/Cmd+Enter)
 * - Shift+Enter: previous row
 * - Arrows: move when caret is at edge (or always for select/checkbox)
 */
export function handleSheetGridKeyDown(event: KeyboardEvent<HTMLElement>) {
  const target = event.target as HTMLElement | null;
  if (!target?.matches?.('[data-sheet-cell]')) return;

  const root = target.closest('[data-sheet-grid]');
  if (!root) return;

  const row = Number(target.getAttribute('data-sheet-row'));
  const col = Number(target.getAttribute('data-sheet-col'));
  if (!Number.isFinite(row) || !Number.isFinite(col)) return;

  const textLike = isTextLike(target);
  const isTextarea = target instanceof HTMLTextAreaElement;
  const key = event.key;

  if (key === 'Enter') {
    if (isTextarea && !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    tryMove(root, row, col, event.shiftKey ? -1 : 1, 0);
    return;
  }

  if (key === 'ArrowDown') {
    if (textLike && !caretAtEnd(target as HTMLInputElement | HTMLTextAreaElement) && isTextarea) {
      return;
    }
    if (textLike && isTextarea) return;
    event.preventDefault();
    tryMove(root, row, col, 1, 0);
    return;
  }

  if (key === 'ArrowUp') {
    if (textLike && !caretAtStart(target as HTMLInputElement | HTMLTextAreaElement) && isTextarea) {
      return;
    }
    if (textLike && isTextarea) return;
    event.preventDefault();
    tryMove(root, row, col, -1, 0);
    return;
  }

  if (key === 'ArrowRight' && textLike) {
    if (!caretAtEnd(target as HTMLInputElement | HTMLTextAreaElement)) return;
    event.preventDefault();
    tryMove(root, row, col, 0, 1);
    return;
  }

  if (key === 'ArrowLeft' && textLike) {
    if (!caretAtStart(target as HTMLInputElement | HTMLTextAreaElement)) return;
    event.preventDefault();
    tryMove(root, row, col, 0, -1);
    return;
  }

  if ((key === 'ArrowRight' || key === 'ArrowLeft') && !textLike) {
    event.preventDefault();
    tryMove(root, row, col, 0, key === 'ArrowRight' ? 1 : -1);
  }
}

export function useSheetKeyboard(enabled: boolean) {
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!enabled) return;
      handleSheetGridKeyDown(event);
    },
    [enabled],
  );

  return { onKeyDown };
}
