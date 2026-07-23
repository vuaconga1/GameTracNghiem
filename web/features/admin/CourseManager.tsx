'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { CourseBackgroundEditor } from '@/features/admin/CourseBackgroundEditor';
import {
  SheetSelectCell,
  SheetSelectHeader,
  useRowSelection,
} from '@/features/admin/useRowSelection';
import {
  SheetEditSaveButton,
  useSheetEditMode,
} from '@/features/admin/useSheetEditMode';
import { courseBackgroundSrc } from '@/lib/courseBackground';

type Course = {
  id: string;
  name: string;
  levelName: string;
  active: boolean;
  backgroundImageUrl?: string | null;
  backgroundImageKey?: string | null;
  _count?: { questions: number };
};

type ClassLevel = {
  id: string;
  levelName: string;
  active: boolean;
};

type SheetRow = {
  key: string;
  id: string | null;
  name: string;
  levelName: string;
  active: boolean;
  backgroundImageUrl: string;
  backgroundImageKey: string | null;
  backgroundImageSrc: string | null;
  questionCount: number;
  dirty: boolean;
  saving: boolean;
  error: string;
};

function toRow(item: Course): SheetRow {
  return {
    key: item.id,
    id: item.id,
    name: item.name,
    levelName: item.levelName,
    active: item.active,
    backgroundImageUrl: item.backgroundImageUrl || '',
    backgroundImageKey: item.backgroundImageKey || null,
    backgroundImageSrc: courseBackgroundSrc(item),
    questionCount: item._count?.questions ?? 0,
    dirty: false,
    saving: false,
    error: '',
  };
}

function emptyRow(): SheetRow {
  return {
    key: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    name: '',
    levelName: '',
    active: true,
    backgroundImageUrl: '',
    backgroundImageKey: null,
    backgroundImageSrc: null,
    questionCount: 0,
    dirty: true,
    saving: false,
    error: '',
  };
}

export function CourseManager({ displayName }: { displayName: string }) {
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [levels, setLevels] = useState<ClassLevel[]>([]);
  const [filterLevel, setFilterLevel] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirtyCount = rows?.filter((row) => row.dirty).length ?? 0;
  const editMode = useSheetEditMode(dirtyCount > 0);
  const rowKeys = useMemo(() => (rows || []).map((r) => r.key), [rows]);
  const selection = useRowSelection(rowKeys);

  const levelOptions = useMemo(
    () =>
      [...new Set(levels.map((item) => item.levelName))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' })),
    [levels]
  );

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterLevel) params.set('levelName', filterLevel);
    if (q.trim()) params.set('q', q.trim());
    const [coursesRes, levelsRes] = await Promise.all([
      fetch(`/api/admin/courses?${params}`),
      fetch('/api/admin/class-levels'),
    ]);
    const coursesData = await coursesRes.json();
    const levelsData = await levelsRes.json();
    if (!coursesData.success) {
      setError(coursesData.message || 'Lỗi tải khóa học');
      return;
    }
    setRows((coursesData.items as Course[]).map(toRow));
    if (levelsData.success) setLevels(levelsData.items);
    setError('');
  }, [filterLevel, q]);

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

  function updateBackground(
    key: string,
    payload: {
      item: { backgroundImageUrl?: string | null; backgroundImageKey?: string | null };
      backgroundImageSrc: string | null;
    }
  ) {
    setRows((prev) =>
      prev
        ? prev.map((row) =>
            row.key === key
              ? {
                  ...row,
                  backgroundImageUrl: payload.item.backgroundImageUrl || '',
                  backgroundImageKey: payload.item.backgroundImageKey || null,
                  backgroundImageSrc: payload.backgroundImageSrc,
                }
              : row
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
      const res = await fetch(row.id ? `/api/admin/courses/${row.id}` : '/api/admin/courses', {
        method: row.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: row.name.trim(),
          levelName: row.levelName.trim(),
          active: row.active,
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
      const saved = data.item as Course;
      setRows((prev) =>
        prev
          ? prev.map((item) =>
              item.key === row.key
                ? {
                    ...toRow({
                      ...saved,
                      _count: { questions: item.questionCount },
                    }),
                    dirty: false,
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
      if (!window.confirm(`Ẩn khóa học “${row.name}” khỏi trang quản trị?`)) return;
      const res = await fetch(`/api/admin/courses/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không ẩn được');
        return;
      }
      setMessage(data.message || 'Đã ẩn khóa học');
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
    let serverDeleted = false;
    const unsavedKeys = new Set<string>();

    for (const row of targets) {
      if (!row.id) {
        unsavedKeys.add(row.key);
        ok += 1;
        continue;
      }
      const res = await fetch(`/api/admin/courses/${row.id}`, { method: 'DELETE' });
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

  return (
    <AdminShell displayName={displayName} title="Khóa học">
      <div className="admin-toolbar">
        <div className="admin-toolbar-actions">
          <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">Tất cả cấp</option>
            {levelOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên khóa..."
            className="sheet-input"
            style={{ minWidth: 160, border: '1px solid var(--admin-border)', background: '#fff' }}
          />
          <span className="sheet-hint">
            {editMode.editing
              ? 'Đang sửa · Tick dòng để ẩn hàng loạt'
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
                  <th>Tên khóa</th>
                  <th>Cấp</th>
                  <th style={{ width: '340px' }}>Ảnh nền</th>
                  <th style={{ width: '88px' }}>Câu hỏi</th>
                  <th style={{ width: '72px' }}>Dùng</th>
                  <th style={{ width: '220px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-empty">
                        Chưa có khóa học. Bấm <strong>Sửa nội dung</strong> rồi{' '}
                        <strong>Thêm dòng</strong>.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
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
                          value={row.name}
                          placeholder="Unit 1"
                          readOnly={!editMode.editing}
                          onChange={(e) => setField(row.key, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="sheet-input"
                          list="course-level-options"
                          value={row.levelName}
                          placeholder="Starters"
                          readOnly={!editMode.editing}
                          onChange={(e) => setField(row.key, 'levelName', e.target.value)}
                        />
                      </td>
                      <td>
                        <CourseBackgroundEditor
                          courseId={row.id}
                          imageSrc={row.backgroundImageSrc}
                          externalUrl={row.backgroundImageUrl}
                          disabled={!editMode.editing}
                          onUpdated={(payload) => updateBackground(row.key, payload)}
                        />
                      </td>
                      <td>{row.questionCount}</td>
                      <td>
                        <input
                          type="checkbox"
                          className="sheet-check"
                          checked={row.active}
                          disabled={!editMode.editing}
                          onChange={(e) => setField(row.key, 'active', e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="admin-toolbar-actions">
                          {row.id ? (
                            <Link
                              className="admin-btn"
                              href={`/admin/courses/${row.id}`}
                              onClick={(e) => {
                                if (!editMode.confirmIfDirty()) e.preventDefault();
                              }}
                            >
                              Nội dung
                            </Link>
                          ) : null}
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
            <datalist id="course-level-options">
              {levels.map((item) => (
                <option key={item.id} value={item.levelName} />
              ))}
            </datalist>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
