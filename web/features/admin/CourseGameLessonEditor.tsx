export type CourseGameLessonEditorValue = {
  pageStart: string;
  pageEnd: string;
  saved: boolean;
};

type CourseGameLessonEditorProps = {
  game: {
    key: string;
    label: string;
  };
  ebookAvailable: boolean;
  value: CourseGameLessonEditorValue;
  busy: boolean;
  onChange: (value: CourseGameLessonEditorValue) => void;
  onSave: () => void;
  onRemove: () => void;
};

export function CourseGameLessonEditor({
  game,
  ebookAvailable,
  value,
  busy,
  onChange,
  onSave,
  onRemove,
}: CourseGameLessonEditorProps) {
  const disabled = busy || !ebookAvailable;

  return (
    <div className="course-game-lesson-editor">
      <div className="course-game-lesson-inputs">
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="Trang từ"
          aria-label={`Trang bắt đầu cho ${game.label}`}
          value={value.pageStart}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, pageStart: event.target.value })
          }
        />
        <span aria-hidden="true">–</span>
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="Trang đến"
          aria-label={`Trang kết thúc cho ${game.label}`}
          value={value.pageEnd}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, pageEnd: event.target.value })
          }
        />
      </div>
      <div className="course-game-lesson-actions">
        <button
          type="button"
          className="admin-btn primary"
          disabled={disabled}
          onClick={onSave}
        >
          {busy ? 'Đang lưu...' : 'Lưu'}
        </button>
        {value.saved ? (
          <button
            type="button"
            className="admin-btn danger"
            disabled={disabled}
            onClick={onRemove}
          >
            Gỡ
          </button>
        ) : null}
      </div>
      {!ebookAvailable ? (
        <span className="course-game-lesson-help">Khóa học chưa gắn sách PDF</span>
      ) : null}
    </div>
  );
}
