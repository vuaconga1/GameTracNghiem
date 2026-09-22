'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type HomeworkItem = {
  assignmentId: string;
  title: string;
  deadlineDisplay: string;
  href: string;
  className: string;
};

export function HomeworkPopup({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<HomeworkItem[] | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    try {
      const res = await fetch('/api/homework/incomplete');
      const data = await res.json();
      if (!data.success) {
        setItems([]);
        return;
      }
      const list = (data.items || []) as HomeworkItem[];
      setItems(list);
      setDisplayName(String(data.displayName || ''));
      if (!list.length) setDismissed(false);
    } catch {
      setItems([]);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!enabled || dismissed || !items || items.length === 0) return null;

  return (
    <div className="homework-popup-backdrop" role="presentation">
      <div
        className="homework-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="homework-popup-title"
      >
        <button
          type="button"
          className="homework-popup-close"
          aria-label="Đóng"
          onClick={() => setDismissed(true)}
        >
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
        <h2 id="homework-popup-title">
          Chào {displayName || 'bạn'}, bạn đang có {items.length} bài tập gần đến hạn nộp
        </h2>
        <ul className="homework-popup-list">
          {items.map((item) => (
            <li key={item.assignmentId}>
              <div className="homework-popup-item-text">
                <strong>{item.title}</strong>
                <span>
                  Hạn: {item.deadlineDisplay}
                  {item.className ? ` · ${item.className}` : ''}
                </span>
              </div>
              <Link
                className="homework-popup-action"
                href={item.href}
                onClick={() => setDismissed(true)}
              >
                Làm bài
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
