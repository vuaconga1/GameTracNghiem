'use client';

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
  const levelOptions = cleanOptions(levels);
  const allActive = !levelName;

  return (
    <div className="filter-section">
      <h3 className="filter-title">Cấp độ</h3>
      <div className="filter-grid" id="filterGrid">
        <button
          type="button"
          className={`filter-item filter-item--solo${allActive ? ' active' : ''}`}
          data-filter-type="level"
          data-level=""
          disabled={disabled}
          onClick={() => onLevelNameChange('')}
        >
          Tất cả
        </button>

        {levelOptions.map((value) => (
          <button
            key={`level-${value}`}
            type="button"
            className={`filter-item${levelName === value ? ' active' : ''}`}
            data-filter-type="level"
            data-level={value}
            disabled={disabled}
            onClick={() => onLevelNameChange(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
