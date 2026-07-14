'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { FolderMediaAttach } from '@/features/admin/FolderMediaAttach';
import {
  SheetSelectCell,
  SheetSelectHeader,
  useRowSelection,
} from '@/features/admin/useRowSelection';
import {
  SheetEditSaveButton,
  useSheetEditMode,
} from '@/features/admin/useSheetEditMode';
import {
  defaultItemForGame,
  emptySheetRow,
  isExerciseGame,
  itemColumnsForGame,
  nextSheetSequence,
  questionToSheetRow,
  serializeItemsForPayload,
  sheetColumnsForGame,
  type SheetColumn,
  type SheetRowState,
  valuesToPayload,
} from '@/lib/admin/sheetColumns';
import { GAME_CATALOG } from '@/lib/gameCatalog';

function cellValue(row: SheetRowState, col: SheetColumn): string | boolean {
  if (col.source === 'meta') {
    if (col.key === 'sortOrder') return String(row.sortOrder);
    if (col.key === 'externalId') return row.externalId;
    if (col.key === 'active') return row.active;
  }
  return row.values[col.key] ?? '';
}

function SheetCell({
  col,
  value,
  onChange,
  editable,
}: {
  col: SheetColumn;
  value: string | boolean;
  onChange: (next: string | boolean) => void;
  editable: boolean;
}) {
  if (col.kind === 'checkbox') {
    return (
      <input
        type="checkbox"
        className="sheet-check"
        checked={Boolean(value)}
        disabled={!editable}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={col.label}
      />
    );
  }

  if (col.kind === 'select' && col.options) {
    return (
      <select
        className="sheet-input"
        value={String(value)}
        disabled={!editable}
        onChange={(e) => onChange(e.target.value)}
      >
        {col.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (col.kind === 'textarea') {
    return (
      <textarea
        className="sheet-input sheet-textarea"
        rows={2}
        value={String(value)}
        placeholder={col.placeholder}
        readOnly={!editable}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      className="sheet-input"
      value={String(value)}
      placeholder={col.placeholder}
      readOnly={!editable}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function QuestionListAdmin({
  displayName,
  courseId,
  game,
}: {
  displayName: string;
  courseId: string;
  game: string;
}) {
  const meta = GAME_CATALOG.find((item) => item.key === game);
  const columns = useMemo(() => sheetColumnsForGame(game), [game]);
  const itemColumns = useMemo(() => itemColumnsForGame(game), [game]);
  const exercise = isExerciseGame(game);

  const [courseName, setCourseName] = useState('');
  const [rows, setRows] = useState<SheetRowState[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirtyCount = rows?.filter((row) => row.dirty).length ?? 0;
  const editMode = useSheetEditMode(dirtyCount > 0);
  const rowKeys = useMemo(() => (rows || []).map((r) => r.key), [rows]);
  const selection = useRowSelection(rowKeys);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/courses/${courseId}/questions?game=${encodeURIComponent(game)}`
    );
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không tải được danh sách');
      return;
    }
    setCourseName(data.course.name);
    setRows(
      (
        data.items as Array<{
          id: string;
          sortOrder: number;
          externalId: string | null;
          active: boolean;
          payload: unknown;
        }>
      ).map((item) => questionToSheetRow(game, item))
    );
    setError('');
  }, [courseId, game]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchRow(key: string, patch: Partial<SheetRowState>, markDirty = true) {
    setRows((prev) =>
      prev
        ? prev.map((row) =>
            row.key === key
              ? { ...row, ...patch, ...(markDirty ? { dirty: true } : {}) }
              : row
          )
        : prev
    );
  }

  function setCell(key: string, col: SheetColumn, value: string | boolean) {
    if (!editMode.editing) return;
    setRows((prev) =>
      prev
        ? prev.map((row) => {
            if (row.key !== key) return row;
            if (col.source === 'meta') {
              if (col.key === 'sortOrder') {
                return { ...row, sortOrder: Number(value) || 0, dirty: true, error: '' };
              }
              if (col.key === 'externalId') {
                return { ...row, externalId: String(value), dirty: true, error: '' };
              }
              if (col.key === 'active') {
                return { ...row, active: Boolean(value), dirty: true, error: '' };
              }
            }
            return {
              ...row,
              values: { ...row.values, [col.key]: value },
              dirty: true,
              error: '',
            };
          })
        : prev
    );
  }

  function addRow() {
    if (!editMode.editing) return;
    setRows((prev) => {
      const list = prev || [];
      const next = nextSheetSequence(list);
      return [...list, emptySheetRow(game, next, String(next))];
    });
    setMessage('');
  }

  async function saveRow(row: SheetRowState) {
    setRows((prev) =>
      prev
        ? prev.map((item) =>
            item.key === row.key ? { ...item, saving: true, error: '' } : item
          )
        : prev
    );

    const itemsPayload = exercise ? serializeItemsForPayload(game, row.items) : undefined;
    const payload = valuesToPayload(game, row.values, row.items);
    if (itemsPayload) {
      payload.items = itemsPayload;
    }

    try {
      const body = {
        game,
        sortOrder: row.sortOrder,
        active: row.active,
        externalId: row.externalId || null,
        payload,
      };
      const res = await fetch(
        row.id
          ? `/api/admin/questions/${row.id}`
          : `/api/admin/courses/${courseId}/questions`,
        {
          method: row.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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

      const saved = data.item as {
        id: string;
        sortOrder: number;
        externalId: string | null;
        active: boolean;
        payload: unknown;
      };
      setRows((prev) =>
        prev
          ? prev.map((item) =>
              item.key === row.key
                ? {
                    ...questionToSheetRow(game, saved),
                    expanded: item.expanded,
                    dirty: false,
                    saving: false,
                    error: '',
                  }
                : item
            )
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
      const success = await saveRow(row);
      if (success) ok += 1;
      else fail += 1;
    }
    setSavingAll(false);
    if (fail === 0) {
      setMessage(`Đã lưu ${ok} dòng`);
      editMode.markSavedAndView();
    } else {
      setError(`Lưu được ${ok} dòng, lỗi ${fail} dòng — xem từng dòng bị đỏ`);
    }
  }

  async function removeRow(row: SheetRowState) {
    if (!editMode.editing) return;
    if (row.id) {
      if (!window.confirm('Ẩn dòng này khỏi trang quản trị? Dữ liệu vẫn giữ trong database.')) {
        return;
      }
      const res = await fetch(`/api/admin/questions/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không ẩn được');
        return;
      }
    }
    setRows((prev) => (prev ? prev.filter((item) => item.key !== row.key) : prev));
    setMessage('Đã ẩn dòng');
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
    let serverDeleted = false;
    const unsavedKeys = new Set<string>();

    for (const row of targets) {
      if (!row.id) {
        unsavedKeys.add(row.key);
        ok += 1;
        continue;
      }
      const res = await fetch(`/api/admin/questions/${row.id}`, { method: 'DELETE' });
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
      setMessage(`Đã ẩn ${ok} dòng`);
      if (serverDeleted) await load();
    } else {
      setError(`Ẩn được ${ok} dòng, lỗi ${fail} dòng`);
      if (serverDeleted) await load();
    }
  }

  function updateItem(rowKey: string, index: number, field: string, value: string | boolean) {
    if (!editMode.editing) return;
    setRows((prev) =>
      prev
        ? prev.map((row) => {
            if (row.key !== rowKey) return row;
            const items = row.items.map((item, i) =>
              i === index ? { ...item, [field]: value } : item
            );
            return { ...row, items, dirty: true, error: '' };
          })
        : prev
    );
  }

  function addItem(rowKey: string) {
    if (!editMode.editing) return;
    setRows((prev) =>
      prev
        ? prev.map((row) =>
            row.key === rowKey
              ? {
                  ...row,
                  items: [...row.items, defaultItemForGame(game)],
                  dirty: true,
                  expanded: true,
                }
              : row
          )
        : prev
    );
  }

  function removeItem(rowKey: string, index: number) {
    if (!editMode.editing) return;
    setRows((prev) =>
      prev
        ? prev.map((row) =>
            row.key === rowKey
              ? {
                  ...row,
                  items: row.items.filter((_, i) => i !== index),
                  dirty: true,
                }
              : row
          )
        : prev
    );
  }

  return (
    <AdminShell displayName={displayName} title={meta ? meta.label : 'Nội dung game'}>
      <div className="admin-toolbar">
        <div className="admin-toolbar-actions">
          <Link
            className="admin-btn"
            href={`/admin/courses/${courseId}`}
            onClick={(e) => {
              if (!editMode.confirmIfDirty()) e.preventDefault();
            }}
          >
            ← {courseName || 'Khóa học'}
          </Link>
          <span className="sheet-hint">
            {editMode.editing
              ? 'Đang sửa · Tab để chuyển ô · Tick dòng để ẩn hàng loạt'
              : 'Chỉ xem · Bấm Sửa nội dung để chỉnh bảng'}
          </span>
        </div>
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
          {(game === 'scramble' || game === 'word_match') && (
            <FolderMediaAttach
              courseId={courseId}
              game={game}
              kind="image"
              label="Gắn thư mục ảnh"
              disabled={savingAll || deleting}
              onDone={() => void load()}
            />
          )}
          {game === 'pronunciation' && (
            <FolderMediaAttach
              courseId={courseId}
              game={game}
              kind="audio"
              label="Gắn thư mục audio"
              disabled={savingAll || deleting}
              onDone={() => void load()}
            />
          )}
          {exercise && (
            <FolderMediaAttach
              courseId={courseId}
              game={game}
              kind="image"
              label="Gắn thư mục ảnh"
              disabled={savingAll || deleting}
              onDone={() => void load()}
            />
          )}
        </div>
      </div>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel sheet-panel">
        {!rows ? (
          <DataLoading />
        ) : (
          <div className="sheet-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <SheetSelectHeader
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                    disabled={!editMode.editing || rows.length === 0}
                    onToggleAll={selection.toggleAll}
                  />
                  {columns.map((col) => (
                    <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                  {exercise ? <th style={{ width: '100px' }}>Dòng con</th> : null}
                  <th style={{ width: '168px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (exercise ? 2 : 1) + 1}>
                      <div className="admin-empty">
                        Chưa có dữ liệu. Bấm <strong>Sửa nội dung</strong> rồi{' '}
                        <strong>Thêm dòng</strong>.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <Fragment key={row.key}>
                      <tr
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
                        {columns.map((col) => (
                          <td key={col.key}>
                            <SheetCell
                              col={col}
                              value={cellValue(row, col)}
                              editable={editMode.editing}
                              onChange={(next) => setCell(row.key, col, next)}
                            />
                          </td>
                        ))}
                        {exercise ? (
                          <td>
                            <button
                              type="button"
                              className="admin-btn"
                              onClick={() =>
                                patchRow(row.key, { expanded: !row.expanded }, false)
                              }
                            >
                              {row.expanded ? 'Thu' : `Mở (${row.items.length})`}
                            </button>
                          </td>
                        ) : null}
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
                      {exercise && row.expanded ? (
                        <tr className="sheet-nested-row">
                          <td colSpan={columns.length + 3}>
                            <div className="sheet-nested">
                              <div className="admin-toolbar">
                                <strong>Dòng trong bài</strong>
                                <button
                                  type="button"
                                  className="admin-btn"
                                  disabled={!editMode.editing}
                                  onClick={() => addItem(row.key)}
                                >
                                  + Thêm dòng con
                                </button>
                              </div>
                              <table className="sheet-table sheet-table-nested">
                                <thead>
                                  <tr>
                                    {itemColumns.map((col) => (
                                      <th key={col.key}>{col.label}</th>
                                    ))}
                                    <th style={{ width: '72px' }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.items.map((item, index) => (
                                    <tr key={`${row.key}-item-${index}`}>
                                      {itemColumns.map((col) => {
                                        const raw = item[col.key];
                                        const value =
                                          col.key === 'is_correct'
                                            ? raw
                                              ? 'true'
                                              : 'false'
                                            : String(raw ?? '');
                                        return (
                                          <td key={col.key}>
                                            <SheetCell
                                              col={col}
                                              value={value}
                                              editable={editMode.editing}
                                              onChange={(next) =>
                                                updateItem(
                                                  row.key,
                                                  index,
                                                  col.key,
                                                  col.key === 'is_correct'
                                                    ? next === true || next === 'true'
                                                    : next
                                                )
                                              }
                                            />
                                          </td>
                                        );
                                      })}
                                      <td>
                                        <button
                                          type="button"
                                          className="admin-btn danger"
                                          disabled={!editMode.editing}
                                          onClick={() => removeItem(row.key, index)}
                                        >
                                          Xóa
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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
