'use client';

import type { ReactNode } from 'react';

/** Plain-language help banner for non-technical admins. */
export function AdminHelp({
  title,
  children,
  steps,
}: {
  title: string;
  children?: ReactNode;
  steps?: string[];
}) {
  return (
    <aside className="admin-help" aria-label={title}>
      <div className="admin-help-head">
        <i className="fas fa-circle-info" aria-hidden="true" />
        <strong>{title}</strong>
      </div>
      {children ? <div className="admin-help-body">{children}</div> : null}
      {steps && steps.length > 0 ? (
        <ol className="admin-help-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}

/** Keyboard cheat-sheet shown while editing spreadsheets. */
export function SheetKeysHint({ editing }: { editing: boolean }) {
  if (!editing) {
    return (
      <p className="sheet-keys-hint">
        <i className="fas fa-lock" aria-hidden="true" /> Chỉ xem — bấm{' '}
        <strong>Sửa nội dung</strong> để chỉnh sửa như Excel.
      </p>
    );
  }

  return (
    <p className="sheet-keys-hint sheet-keys-hint-edit">
      <i className="fas fa-keyboard" aria-hidden="true" />{' '}
      <kbd>Tab</kbd> ô kế · <kbd>Enter</kbd> xuống dòng · <kbd>↑</kbd>
      <kbd>↓</kbd>
      <kbd>←</kbd>
      <kbd>→</kbd> chuyển ô · Ô vàng = chưa lưu · nhớ bấm <strong>Lưu thay đổi</strong>
    </p>
  );
}

/** Numbered section card for course detail wizard-style layout. */
export function AdminStep({
  step,
  title,
  help,
  children,
}: {
  step: number;
  title: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-step-panel">
      <header className="admin-step-head">
        <span className="admin-step-num" aria-hidden="true">
          {step}
        </span>
        <div>
          <h3>{title}</h3>
          <p>{help}</p>
        </div>
      </header>
      <div className="admin-step-body">{children}</div>
    </section>
  );
}
