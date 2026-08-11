'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { AdminHelp } from '@/features/admin/AdminHelp';
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
    <AdminShell
      displayName={displayName}
      title="Tổng quan"
      subtitle="Không cần biết code — làm theo 4 ô bên dưới là đủ"
    >
      <AdminHelp title="Admin dùng để làm gì?">
        Quản lý lớp học, unit, sách PDF bài học, câu hỏi game và tài khoản học sinh. Các bảng
        nhập liệu hoạt động gần giống Excel: bấm <strong>Sửa nội dung</strong>, điền ô, rồi{' '}
        <strong>Lưu thay đổi</strong>.
      </AdminHelp>

      {error ? <div className="admin-alert error">{error}</div> : null}
      {!stats ? (
        <DataLoading />
      ) : (
        <>
          <div className="admin-start-grid">
            <Link className="admin-start-card" href="/admin/class-levels">
              <span className="step">Bước 1</span>
              <strong>Cấp độ / Lớp</strong>
              <span>Tạo Lớp 1, Lớp 2… để phân nhóm khóa học.</span>
            </Link>
            <Link className="admin-start-card" href="/admin/courses">
              <span className="step">Bước 2</span>
              <strong>Khóa học (Unit)</strong>
              <span>Thêm unit → bấm Nội dung để gắn PDF và câu hỏi.</span>
            </Link>
            <Link className="admin-start-card" href="/admin/ebooks">
              <span className="step">Bước 3</span>
              <strong>Sách PDF</strong>
              <span>Upload file “Từ Vựng + Grammar” rồi gắn vào unit.</span>
            </Link>
            <Link className="admin-start-card" href="/admin/users">
              <span className="step">Bước 4</span>
              <strong>Tài khoản</strong>
              <span>Tạo username / mật khẩu cho học sinh và giáo viên.</span>
            </Link>
          </div>

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

          <div className="admin-panel">
            <h3 style={{ marginTop: 0 }}>Số câu hỏi theo game</h3>
            <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              Chỉ để xem nhanh — muốn sửa thì vào Khóa học → Nội dung → chọn game.
            </p>
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
                      <td colSpan={2}>
                        <div className="admin-empty">Chưa có câu hỏi</div>
                      </td>
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
