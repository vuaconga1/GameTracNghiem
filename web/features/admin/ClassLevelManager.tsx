'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { AdminHelp, SheetKeysHint } from '@/features/admin/AdminHelp';
import {
  SheetSelectCell,
  SheetSelectHeader,
  useRowSelection,
} from '@/features/admin/useRowSelection';
import {
  SheetEditSaveButton,
  useSheetEditMode,
} from '@/features/admin/useSheetEditMode';
import { sheetNav, useSheetKeyboard } from '@/features/admin/useSheetKeyboard';

type ClassLevel = {
  id: string;
  levelName: string;
  active: boolean;
};

type SheetRow = {
  key: string;
  id: string | null;
  levelName: string;
  active: boolean;
  dirty: boolean;
  saving: boolean;
  error: string;
};

function toRow(item: ClassLevel): SheetRow {
  return {
    key: item.id,
    id: item.id,
    levelName: item.levelName,
    active: item.active,
    dirty: false,
    saving: false,
    error: '',
  };
}

function emptyRow(): SheetRow {
  return {
    key: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    levelName: '',
    active: true,
    dirty: true,
    saving: false,
    error: '',
  };
}

export function ClassLevelManager({ displayName }: { displayName: string }) {
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirtyCount = rows?.filter((row) => row.dirty).length ?? 0;
  const editMode = useSheetEditMode(dirtyCount > 0);
  const sheetKeys = useSheetKeyboard(editMode.editing);
  const rowKeys = useMemo(() => (rows || []).map((row) => row.key), [rows]);
  const selection = useRowSelection(rowKeys);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/class-levels');
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Lỗi tải dữ liệu');
      return;
    }
    setRows((data.items as ClassLevel[]).map(toRow));
    setError('');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField(key: string, field: keyof SheetRow, value: string | boolean) {
    if (!editMode.editing) return;
    setRows((prev) =>
      prev
        ? prev.map((row) =>
            row.key === key ? { ...row, [field]: value, dirty: true, error: '' } : row
          )
        : prev
    );
  }

  function addRow() {
    if (!editMode.editing) return;
    setRows((prev) => [...(prev || []), emptyRow()]);
    setMessage('');
  }

  async function saveRow(row: SheetRow) {
    setRows((prev) =>
      prev
        ? prev.map((item) =>
            item.key === row.key ? { ...item, saving: true, error: '' } : item
          )
        : prev
    );

    try {
      const res = await fetch(
        row.id ? `/api/admin/class-levels/${row.id}` : '/api/admin/class-levels',
        {
          method: row.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            levelName: row.levelName.trim(),
            active: row.active,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        setRows((prev) =>
          prev
            ? prev.map((item) =>
                item.key === row.key
                  ? { ...item, saving: false, error: data.message || 'Lưu thất bại' }
                  : item
              )
            : prev
        );
        return false;
      }
      const saved = toRow(data.item as ClassLevel);
      setRows((prev) =>
        prev
          ? prev.map((item) => (item.key === row.key ? { ...saved, dirty: false } : item))
          : prev
      );
      return true;
    } catch {
      setRows((prev) =>
        prev
          ? prev.map((item) =>
              item.key === row.key
                ? { ...item, saving: false, error: 'Lỗi mạng khi lưu' }
                : item
            )
          : prev
      );
      return false;
    }
  }

  async function saveAllDirty() {
    if (!rows) return;
    setSavingAll(true);
    setMessage('');
    setError('');
    let ok = 0;
    let fail = 0;
    for (const row of rows.filter((item) => item.dirty)) {
      if (await saveRow(row)) ok += 1;
      else fail += 1;
    }
    setSavingAll(false);
    if (fail === 0) {
      setMessage(`Đã lưu ${ok} dòng`);
      editMode.markSavedAndView();
    } else {
      setError(`Lưu được ${ok} dòng, lỗi ${fail} dòng`);
    }
  }

  async function removeRow(row: SheetRow) {
    if (!editMode.editing) return;
    if (row.id) {
      if (!window.confirm(`Ẩn cấp “${row.levelName}” khỏi trang quản trị?`)) return;
      const res = await fetch(`/api/admin/class-levels/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không ẩn được');
        return;
      }
      setMessage(data.message || 'Đã ẩn');
      await load();
      return;
    }
    setRows((prev) => (prev ? prev.filter((item) => item.key !== row.key) : prev));
  }

  async function removeSelected() {
    if (!editMode.editing || !rows || selection.selectedCount === 0) return;
    const targets = rows.filter((row) => selection.isSelected(row.key));
    if (
      !window.confirm(
        `Ẩn ${targets.length} dòng đã chọn khỏi trang quản trị? Dữ liệu vẫn giữ trong database.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError('');
    let ok = 0;
    let fail = 0;
    const unsavedKeys = new Set<string>();

    for (const row of targets) {
      if (!row.id) {
        unsavedKeys.add(row.key);
        ok += 1;
        continue;
      }
      const res = await fetch(`/api/admin/class-levels/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) ok += 1;
      else fail += 1;
    }

    if (unsavedKeys.size) {
      setRows((prev) => (prev ? prev.filter((row) => !unsavedKeys.has(row.key)) : prev));
    }

    selection.clear();
    setDeleting(false);
    if (fail === 0) {
      setMessage(`Đã ẩn ${ok} dòng`);
      await load();
    } else {
      setError(`Ẩn được ${ok} dòng, lỗi ${fail} dòng`);
      await load();
    }
  }

  return (
    <AdminShell
      displayName={displayName}
      title="Cấp độ / Lớp"
      subtitle="Ví dụ: Lớp 1, Lớp 2… dùng để lọc khóa học."
    >
      <AdminHelp
        title="Cấp độ là gì?"
        steps={[
          'Mỗi dòng là một lớp/cấp (vd. “Lớp 4”). Học sinh chọn cấp này trên trang khóa học.',
          'Bấm Sửa nội dung → Thêm dòng → gõ tên → Enter xuống dòng kế → Lưu thay đổi.',
          'Không xóa cấp đang có unit — hãy tắt cột “Hiện” nếu tạm không dùng.',
        ]}
      />

      <div className="admin-toolbar">
        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn"
            disabled={!editMode.editing}
            onClick={addRow}
          >
            <i className="fas fa-plus" aria-hidden="true" /> Thêm dòng
          </button>
          <button
            type="button"
            className="admin-btn danger"
            disabled={!editMode.editing || deleting || selection.selectedCount === 0}
            onClick={() => void removeSelected()}
          >
            <i className="fas fa-trash" aria-hidden="true" />{' '}
            {deleting
              ? 'Đang ẩn...'
              : `Xóa đã chọn${selection.selectedCount ? ` (${selection.selectedCount})` : ''}`}
          </button>
          <SheetEditSaveButton
            editing={editMode.editing}
            dirtyCount={dirtyCount}
            saving={savingAll}
            onBeginEdit={editMode.beginEdit}
            onSave={() => void saveAllDirty()}
          />
        </div>
      </div>

      <SheetKeysHint editing={editMode.editing} />

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel sheet-panel">
        {!rows ? (
          <DataLoading />
        ) : (
          <div
            className="sheet-wrap"
            data-sheet-grid
            onKeyDown={sheetKeys.onKeyDown}
          >
            <table className="sheet-table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <SheetSelectHeader
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                    disabled={!editMode.editing || rows.length === 0}
                    onToggleAll={selection.toggleAll}
                  />
                  <th>Tên cấp / lớp</th>
                  <th style={{ width: '72px' }}>Hiện</th>
                  <th style={{ width: '168px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="admin-empty">
                        Chưa có dữ liệu. Bấm <strong>Sửa nội dung</strong> rồi{' '}
                        <strong>Thêm dòng</strong>.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr
                      key={row.key}
                      className={[
                        row.dirty ? 'sheet-row-dirty' : '',
                        row.error ? 'sheet-row-error' : '',
                        selection.isSelected(row.key) ? 'sheet-row-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <SheetSelectCell
                        checked={selection.isSelected(row.key)}
                        disabled={!editMode.editing}
                        onChange={() => selection.toggle(row.key)}
                      />
                      <td>
                        <input
                          className="sheet-input"
                          value={row.levelName}
                          placeholder="Lớp 4"
                          readOnly={!editMode.editing}
                          {...sheetNav(rowIndex, 0)}
                          onChange={(e) => setField(row.key, 'levelName', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="sheet-check"
                          checked={row.active}
                          disabled={!editMode.editing}
                          {...sheetNav(rowIndex, 1)}
                          onChange={(e) => setField(row.key, 'active', e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="admin-toolbar-actions">
                          <button
                            type="button"
                            className="admin-btn primary"
                            disabled={!editMode.editing || row.saving || !row.dirty}
                            onClick={() => void saveRow(row)}
                          >
                            {row.saving ? '...' : 'Lưu'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn danger"
                            disabled={!editMode.editing}
                            onClick={() => void removeRow(row)}
                          >
                            Xóa
                          </button>
                        </div>
                        {row.error ? <div className="sheet-row-msg">{row.error}</div> : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
