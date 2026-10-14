'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { TEACHER_AUDIT_ASSIGN, TEACHER_AUDIT_LOGIN } from '@/lib/teacherAuditActions';
import { formatVnDateTime } from '@/lib/vnDateTime';

type AuditItem = {
  id: string;
  action: string;
  actorUsername: string;
  actorDisplayName: string;
  className: string | null;
  levelName: string | null;
  courseName: string | null;
  skillLabel: string | null;
  gameLabel: string | null;
  deadlineAt: string | null;
  createdAt: string;
};

type ActionFilter = '' | typeof TEACHER_AUDIT_LOGIN | typeof TEACHER_AUDIT_ASSIGN;

function actionLabel(action: string) {
  if (action === TEACHER_AUDIT_LOGIN) return 'Đăng nhập';
  if (action === TEACHER_AUDIT_ASSIGN) return 'Giao bài tập';
  return action;
}

function homeworkDetail(item: AuditItem) {
  const parts = [item.levelName, item.courseName, item.skillLabel, item.gameLabel].filter(Boolean);
  const title = parts.join(' · ');
  const deadline = item.deadlineAt ? `Hạn nộp ${formatVnDateTime(item.deadlineAt)}` : '';
  return [item.className ? `Lớp ${item.className}` : '', title, deadline].filter(Boolean).join(' — ');
}

export function TeacherAuditLog({ displayName }: { displayName: string }) {
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState<ActionFilter>('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (offset: number, append: boolean) => {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (appliedQuery) params.set('q', appliedQuery);
      params.set('offset', String(offset));
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không tải được nhật ký');
        if (!append) setItems([]);
        return;
      }
      const next = data.items as AuditItem[];
      setItems((current) => (append && current ? [...current, ...next] : next));
      setTotal(Number(data.total) || 0);
      setHasMore(Boolean(data.hasMore));
      setError('');
    },
    [action, appliedQuery],
  );

  useEffect(() => {
    setItems(null);
    void load(0, false);
  }, [load]);

  async function loadMore() {
    if (!items || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await load(items.length, true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <AdminShell
      displayName={displayName}
      title="Nhật ký giáo viên"
      subtitle="Đăng nhập và giao bài thành công của tài khoản giáo viên"
    >
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <input
          className="admin-toolbar-input"
          style={{ flex: '1 1 240px', minWidth: 200 }}
          placeholder="Tìm giáo viên, username, lớp hoặc bài tập"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setAppliedQuery(query.trim());
          }}
          aria-label="Tìm trong nhật ký"
        />
        <button type="button" className="admin-btn" onClick={() => setAppliedQuery(query.trim())}>
          Tìm
        </button>
        <select
          className="admin-toolbar-input"
          value={action}
          onChange={(event) => setAction(event.target.value as ActionFilter)}
          aria-label="Lọc loại thao tác"
        >
          <option value="">Tất cả thao tác</option>
          <option value={TEACHER_AUDIT_LOGIN}>Đăng nhập</option>
          <option value={TEACHER_AUDIT_ASSIGN}>Giao bài tập</option>
        </select>
      </div>

      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel">
        {items === null ? (
          <DataLoading />
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có thao tác nào của giáo viên.</div>
        ) : (
          <>
            <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              {total} thao tác. Giờ hiển thị theo Việt Nam.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Giáo viên</th>
                    <th>Thao tác</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatVnDateTime(item.createdAt)}</td>
                      <td>
                        <strong>{item.actorDisplayName}</strong>
                        <div style={{ color: 'var(--admin-muted)' }}>{item.actorUsername}</div>
                      </td>
                      <td>{actionLabel(item.action)}</td>
                      <td>
                        {item.action === TEACHER_AUDIT_ASSIGN
                          ? homeworkDetail(item)
                          : 'Đăng nhập vào web'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore ? (
              <button
                type="button"
                className="admin-btn"
                style={{ marginTop: 12 }}
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                Xem thêm
              </button>
            ) : null}
            {loadingMore ? <DataLoading /> : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}
