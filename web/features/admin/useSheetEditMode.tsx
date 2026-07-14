'use client';

import { useCallback, useId, useState } from 'react';

import { useAdminDirty } from '@/features/admin/AdminDirtyGuard';

/**
 * View/edit gate for admin spreadsheet pages.
 * View: read-only. Edit: editable. Save button appears only while editing.
 */
export function useSheetEditMode(dirty: boolean) {
  const [editing, setEditing] = useState(false);
  const dirtyId = useId();
  useAdminDirty(dirtyId, editing && dirty);

  const beginEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const confirmIfDirty = useCallback(() => {
    if (!(editing && dirty)) return true;
    return window.confirm(
      'Bạn có thay đổi chưa lưu. Rời trang / hủy sửa sẽ mất các thay đổi chưa lưu.'
    );
  }, [editing, dirty]);

  const exitEdit = useCallback(
    (opts?: { force?: boolean }) => {
      if (!opts?.force && editing && dirty && !confirmIfDirty()) {
        return false;
      }
      setEditing(false);
      return true;
    },
    [editing, dirty, confirmIfDirty]
  );

  const markSavedAndView = useCallback(() => {
    setEditing(false);
  }, []);

  return {
    editing,
    beginEdit,
    exitEdit,
    confirmIfDirty,
    markSavedAndView,
  };
}

type SheetEditSaveButtonProps = {
  editing: boolean;
  dirtyCount: number;
  saving?: boolean;
  onBeginEdit: () => void;
  onSave: () => void;
};

/** Single toolbar control: Sửa nội dung ↔ Lưu thay đổi */
export function SheetEditSaveButton({
  editing,
  dirtyCount,
  saving,
  onBeginEdit,
  onSave,
}: SheetEditSaveButtonProps) {
  if (!editing) {
    return (
      <button type="button" className="admin-btn primary" onClick={onBeginEdit}>
        <i className="fas fa-pen" aria-hidden="true" /> Sửa nội dung
      </button>
    );
  }

  return (
    <button
      type="button"
      className="admin-btn primary"
      disabled={saving || dirtyCount === 0}
      onClick={onSave}
    >
      <i className="fas fa-floppy-disk" aria-hidden="true" />{' '}
      {saving ? 'Đang lưu...' : `Lưu thay đổi${dirtyCount ? ` (${dirtyCount})` : ''}`}
    </button>
  );
}
