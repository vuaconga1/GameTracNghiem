'use client';

import { useCallback, useMemo, useState } from 'react';

/** Shared row multi-select for admin spreadsheet pages. */
export function useRowSelection(rowKeys: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const key of rowKeys) {
      if (selected.has(key)) count += 1;
    }
    return count;
  }, [rowKeys, selected]);

  const allSelected = rowKeys.length > 0 && selectedCount === rowKeys.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (rowKeys.length === 0) return new Set();
      const everySelected = rowKeys.every((key) => prev.has(key));
      if (everySelected) return new Set();
      return new Set(rowKeys);
    });
  }, [rowKeys]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((key: string) => selected.has(key), [selected]);

  const selectedKeys = useCallback(
    () => rowKeys.filter((key) => selected.has(key)),
    [rowKeys, selected]
  );

  return {
    selectedCount,
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    clear,
    isSelected,
    selectedKeys,
  };
}

type SelectHeaderProps = {
  allSelected: boolean;
  someSelected: boolean;
  disabled?: boolean;
  onToggleAll: () => void;
};

export function SheetSelectHeader({
  allSelected,
  someSelected,
  disabled,
  onToggleAll,
}: SelectHeaderProps) {
  return (
    <th style={{ width: '40px' }} title="Chọn tất cả">
      <input
        type="checkbox"
        className="sheet-check"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected;
        }}
        disabled={disabled}
        onChange={onToggleAll}
        aria-label="Chọn tất cả dòng"
      />
    </th>
  );
}

type SelectCellProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
  disabled?: boolean;
};

export function SheetSelectCell({ checked, onChange, label, disabled }: SelectCellProps) {
  return (
    <td>
      <input
        type="checkbox"
        className="sheet-check"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label || 'Chọn dòng'}
      />
    </td>
  );
}
