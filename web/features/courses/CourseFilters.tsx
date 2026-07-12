'use client';

type CourseFiltersProps = {
  classes: string[];
  levels: string[];
  className: string;
  levelName: string;
  disabled?: boolean;
  onClassNameChange: (value: string) => void;
  onLevelNameChange: (value: string) => void;
};

export function CourseFilters({
  classes,
  levels,
  className,
  levelName,
  disabled = false,
  onClassNameChange,
  onLevelNameChange,
}: CourseFiltersProps) {
  const classOptions = ['', ...classes];
  const levelOptions = ['', ...levels];

  return (
    <div className="filter-section">
      <h3 className="filter-title">Lớp/Cấp độ</h3>
      <div className="filter-grid" id="filterGrid">
        {classOptions.map((value) => (
          <button
            key={`class-${value || 'all'}`}
            type="button"
            className={`filter-item${className === value ? ' active' : ''}${value === '' ? ' filter-item--solo' : ''}`}
            data-filter-type="class"
            data-class={value}
            disabled={disabled}
            onClick={() => onClassNameChange(value)}
          >
            {value || 'Tất cả'}
          </button>
        ))}

        {levelOptions.map((value) => (
          <button
            key={`level-${value || 'all'}`}
            type="button"
            className={`filter-item${levelName === value ? ' active' : ''}${value === '' ? ' filter-item--solo' : ''}`}
            data-filter-type="level"
            data-class={className}
            data-level={value}
            disabled={disabled}
            onClick={() => onLevelNameChange(value)}
          >
            {value || 'Tất cả'}
          </button>
        ))}
      </div>
    </div>
  );
}
