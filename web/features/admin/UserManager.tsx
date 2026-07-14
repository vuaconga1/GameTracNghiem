'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import {
  SheetSelectCell,
  SheetSelectHeader,
  useRowSelection,
} from '@/features/admin/useRowSelection';
import {
  SheetEditSaveButton,
  useSheetEditMode,
} from '@/features/admin/useSheetEditMode';

type UserItem = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
};

type SheetRow = {
  key: string;
  id: string | null;
  username: string;
  password: string;
  displayName: string;
  role: 'student' | 'admin';
  dirty: boolean;
  saving: boolean;
  error: string;
};

function toRow(item: UserItem): SheetRow {
  return {
    key: item.id,
    id: item.id,
    username: item.username,
    password: '',
    displayName: item.displayName,
    role: item.role === 'admin' ? 'admin' : 'student',
    dirty: false,
    saving: false,
    error: '',
  };
}

function emptyRow(): SheetRow {
  return {
    key: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    username: '',
    password: '',
    displayName: '',
    role: 'student',
    dirty: true,
    saving: false,
    error: '',
  };
}

export function UserManager({
  displayName,
  currentUserId,
}: {
  displayName: string;
  currentUserId: string;
}) {
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirtyCount = rows?.filter((row) => row.dirty).length ?? 0;
  const editMode = useSheetEditMode(dirtyCount > 0);
  const rowKeys = useMemo(() => (rows || []).map((r) => r.key), [rows]);
  const selection = useRowSelection(rowKeys);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không tải được tài khoản');
      return;
    }
    setRows((data.items as UserItem[]).map(toRow));
    setError('');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField(key: string, field: keyof SheetRow, value: string) {
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
      if (!row.id) {
        if (!row.username.trim() || !row.password.trim() || !row.displayName.trim()) {
          setRows((prev) =>
            prev
              ? prev.map((item) =>
                  item.key === row.key
                    ? {
                        ...item,
                        saving: false,
                        error: 'Cần username, mật khẩu và tên hiển thị',
                      }
                    : item
                )
              : prev
          );
          return false;
        }
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: row.username.trim(),
            password: row.password,
            displayName: row.displayName.trim(),
            role: row.role,
          }),
        });
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
        const saved = toRow(data.item as UserItem);
        setRows((prev) =>
          prev
            ? prev.map((item) => (item.key === row.key ? { ...saved, dirty: false } : item))
            : prev
        );
        return true;
      }

      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: row.displayName.trim(),
          role: row.role,
          ...(row.password.trim() ? { password: row.password.trim() } : {}),
        }),
      });
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
      const saved = toRow(data.item as UserItem);
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
      if (row.id === currentUserId) {
        setError('Không thể xóa chính tài khoản đang đăng nhập');
        return;
      }
      if (!window.confirm(`Ẩn tài khoản “${row.username}” khỏi trang quản trị?`)) return;
      const res = await fetch(`/api/admin/users/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không ẩn được');
        return;
      }
      setMessage(data.message || 'Đã ẩn tài khoản');
      await load();
      return;
    }
    setRows((prev) => (prev ? prev.filter((item) => item.key !== row.key) : prev));
  }

  async function removeSelected() {
    if (!editMode.editing || !rows || selection.selectedCount === 0) return;
    const targets = rows.filter((row) => selection.isSelected(row.key));
    const deletable = targets.filter((row) => row.id !== currentUserId);
    const skippedSelf = targets.length - deletable.length;
    if (deletable.length === 0) {
      setError('Không thể xóa chính tài khoản đang đăng nhập');
      selection.clear();
      return;
    }
    if (
      !window.confirm(
        `Ẩn ${deletable.length} dòng đã chọn khỏi trang quản trị?${
          skippedSelf ? ' (Bỏ qua tài khoản đang đăng nhập)' : ''
        } Dữ liệu vẫn giữ trong database.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError('');
    let ok = 0;
    let fail = 0;
    let serverDeleted = false;
    const unsavedKeys = new Set<string>();

    for (const row of deletable) {
      if (!row.id) {
        unsavedKeys.add(row.key);
        ok += 1;
        continue;
      }
      const res = await fetch(`/api/admin/users/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        ok += 1;
        serverDeleted = true;
      } else fail += 1;
    }

    if (unsavedKeys.size) {
      setRows((prev) => (prev ? prev.filter((row) => !unsavedKeys.has(row.key)) : prev));
    }

    selection.clear();
    setDeleting(false);
    if (fail === 0) {
      setMessage(
        skippedSelf
          ? `Đã ẩn ${ok} dòng (đã bỏ qua tài khoản đang đăng nhập)`
          : `Đã ẩn ${ok} dòng`
      );
      if (serverDeleted) await load();
    } else {
      setError(`Ẩn được ${ok} dòng, lỗi ${fail} dòng`);
      if (serverDeleted) await load();
    }
  }

  return (
    <AdminShell displayName={displayName} title="Tài khoản">
      <div className="admin-toolbar">
        <span className="sheet-hint">
          {editMode.editing
            ? 'Đang sửa · Mật khẩu để trống = giữ nguyên · Tick dòng để ẩn hàng loạt'
            : 'Chỉ xem · Bấm Sửa nội dung để chỉnh bảng'}
        </span>
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

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel sheet-panel">
        {!rows ? (
          <DataLoading />
        ) : (
          <div className="sheet-wrap">
            <table className="sheet-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <SheetSelectHeader
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                    disabled={!editMode.editing || rows.length === 0}
                    onToggleAll={selection.toggleAll}
                  />
                  <th>Username</th>
                  <th>Mật khẩu</th>
                  <th>Tên hiển thị</th>
                  <th style={{ width: '130px' }}>Vai trò</th>
                  <th style={{ width: '168px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="admin-empty">
                        Chưa có tài khoản. Bấm <strong>Sửa nội dung</strong> rồi{' '}
                        <strong>Thêm dòng</strong>.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelf = Boolean(row.id && row.id === currentUserId);
                    return (
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
                            value={row.username}
                            disabled={Boolean(row.id) || !editMode.editing}
                            readOnly={!editMode.editing}
                            placeholder="username"
                            onChange={(e) => setField(row.key, 'username', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="sheet-input"
                            type="password"
                            value={row.password}
                            readOnly={!editMode.editing}
                            placeholder={row.id ? '(giữ nguyên)' : 'mật khẩu'}
                            onChange={(e) => setField(row.key, 'password', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="sheet-input"
                            value={row.displayName}
                            readOnly={!editMode.editing}
                            placeholder="Tên hiển thị"
                            onChange={(e) => setField(row.key, 'displayName', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="sheet-input"
                            value={row.role}
                            disabled={!editMode.editing}
                            onChange={(e) =>
                              setField(
                                row.key,
                                'role',
                                e.target.value === 'admin' ? 'admin' : 'student'
                              )
                            }
                          >
                            <option value="student">Học sinh</option>
                            <option value="admin">Quản trị</option>
                          </select>
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
                            {!isSelf ? (
                              <button
                                type="button"
                                className="admin-btn danger"
                                disabled={!editMode.editing}
                                onClick={() => void removeRow(row)}
                              >
                                Xóa
                              </button>
                            ) : null}
                          </div>
                          {row.error ? <div className="sheet-row-msg">{row.error}</div> : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
