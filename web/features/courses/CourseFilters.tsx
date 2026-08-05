'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import { useSidebar } from '@/components/shell/SidebarContext';

type CourseFiltersProps = {
  levels: string[];
  levelName: string;
  disabled?: boolean;
  onLevelNameChange: (value: string) => void;
};

function isAllLabel(value: string) {
  return !String(value || '').trim() || String(value).trim() === 'Tất cả';
}

function cleanOptions(values: string[]) {
  return values.filter((value) => !isAllLabel(value));
}

export function CourseFilters({
  levels,
  levelName,
  disabled = false,
  onLevelNameChange,
}: CourseFiltersProps) {
  const { t, formatClassLevel } = useI18n();
  const levelOptions = cleanOptions(levels);
  const { setOpen } = useSidebar();

  const handleSelectLevel = (value: string) => {
    onLevelNameChange(value);
    setOpen(false);
  };

  return (
    <div className="filter-section">
      <h3 className="filter-title">{t('home.filterLevel')}</h3>
      <div className="filter-grid" id="filterGrid">
        {levelOptions.map((value) => (
          <button
            key={`level-${value}`}
            type="button"
            className={`filter-item${levelName === value ? ' active' : ''}`}
            data-filter-type="level"
            data-level={value}
            disabled={disabled}
            onClick={() => handleSelectLevel(value)}
          >
            <i className="fas fa-graduation-cap" aria-hidden="true" />
            <span>{formatClassLevel(value)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
