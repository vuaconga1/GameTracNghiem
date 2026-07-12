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
  return (
    <div className="grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[0_14px_40px_rgba(13,43,110,0.06)] sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-black text-[var(--primary)]">
        Lớp
        <select
          value={className}
          onChange={(event) => onClassNameChange(event.target.value)}
          disabled={disabled}
          className="rounded-2xl border border-[var(--border)] bg-[var(--white)] px-4 py-3 font-bold text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Tất cả lớp</option>
          {classes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-black text-[var(--primary)]">
        Cấp độ
        <select
          value={levelName}
          onChange={(event) => onLevelNameChange(event.target.value)}
          disabled={disabled}
          className="rounded-2xl border border-[var(--border)] bg-[var(--white)] px-4 py-3 font-bold text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Tất cả cấp độ</option>
          {levels.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
