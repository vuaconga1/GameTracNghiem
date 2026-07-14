'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { GAME_CATALOG } from '@/lib/gameCatalog';

type Stats = {
  courses: number;
  questions: number;
  users: number;
  classLevels: number;
  byGame: Array<{ game: string; count: number }>;
};

export function AdminDashboard({ displayName }: { displayName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (!cancelled) {
          if (!data.success) setError(data.message || 'Không tải được thống kê');
          else setStats(data.stats);
        }
      } catch {
        if (!cancelled) setError('Không tải được thống kê');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const labelByKey = Object.fromEntries(GAME_CATALOG.map((g) => [g.key, g.label]));

  return (
    <AdminShell displayName={displayName} title="Tổng quan">
      {error ? <div className="admin-alert error">{error}</div> : null}
      {!stats ? (
        <DataLoading />
      ) : (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <div className="label">Khóa học đang bật</div>
              <div className="value">{stats.courses}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Câu hỏi / bài đang bật</div>
              <div className="value">{stats.questions}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Cấp độ</div>
              <div className="value">{stats.classLevels}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Tài khoản</div>
              <div className="value">{stats.users}</div>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-toolbar-actions">
              <Link className="admin-btn primary" href="/admin/courses">
                <i className="fas fa-plus" aria-hidden="true" /> Quản lý khóa học
              </Link>
              <Link className="admin-btn" href="/admin/class-levels">
                Cấp độ
              </Link>
            </div>
          </div>

          <div className="admin-panel">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Số lượng theo game</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Số câu / bài</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byGame.length === 0 ? (
                    <tr>
                      <td colSpan={2}>Chưa có nội dung</td>
                    </tr>
                  ) : (
                    stats.byGame.map((row) => (
                      <tr key={row.game}>
                        <td>{labelByKey[row.game] || row.game}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
