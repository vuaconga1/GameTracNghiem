'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';

type ClassItem = {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  assignmentCount: number;
  createdBy: { id: string; displayName: string; username: string };
};

export function ClassManager({
  displayName,
  isAdmin,
}: {
  displayName: string;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState<ClassItem[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/classes');
      let data: { success?: boolean; message?: string; items?: ClassItem[] };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError('Máy chủ trả về phản hồi không hợp lệ khi tải danh sách lớp');
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || `Không tải được danh sách lớp (mã ${res.status})`);
        return;
      }
      setItems(data.items as ClassItem[]);
      setError('');
    } catch {
      setError('Không kết nối được máy chủ khi tải danh sách lớp');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createClass(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage('');
      setError('Vui lòng nhập tên lớp');
      return;
    }
    if (creating) return;
    setCreating(true);
    setMessage('');
    setError('');
    let created = false;
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      let data: { success?: boolean; message?: string; item?: { name?: string } };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError('Máy chủ trả về phản hồi không hợp lệ. Thử tải lại trang.');
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || `Không tạo được lớp (mã ${res.status})`);
        return;
      }
      setName('');
      setMessage(`Đã tạo lớp “${data.item?.name || trimmed}”`);
      created = true;
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    } finally {
      setCreating(false);
    }
    // Refresh list after unlocking the button so a slow load cannot stick "Đang tạo…"
    if (created) {
      await load();
    }
  }

  async function deleteClass(item: ClassItem) {
    if (!window.confirm(`Xóa lớp “${item.name}”? Học viên và bài tập giao sẽ bị xóa khỏi lớp.`)) {
      return;
    }
    const res = await fetch(`/api/admin/classes/${item.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không xóa được lớp');
      return;
    }
    setMessage(`Đã xóa lớp “${item.name}”`);
    await load();
  }

  return (
    <AdminShell
      displayName={displayName}
      title="Quản lý lớp học"
      subtitle="Tạo lớp, thêm học viên và giao bài tập về nhà"
      isAdmin={isAdmin}
    >
      <form className="admin-toolbar" onSubmit={(e) => void createClass(e)}>
        <div className="admin-toolbar-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
          <input
            className="admin-toolbar-input"
            placeholder="Tên lớp (vd: Lớp 9A — cô Mai)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            maxLength={120}
            aria-label="Tên lớp"
          />
          <button type="submit" className="admin-btn primary" disabled={creating}>
            {creating ? 'Đang tạo…' : 'Tạo lớp'}
          </button>
        </div>
      </form>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel">
        {items === null ? (
          <DataLoading />
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có lớp nào. Hãy tạo lớp đầu tiên ở trên.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên lớp</th>
                  <th>Học viên</th>
                  <th>Bài tập</th>
                  {isAdmin ? <th>Người tạo</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/admin/classes/${item.id}`} className="admin-link">
                        <strong>{item.name}</strong>
                      </Link>
                    </td>
                    <td>{item.memberCount}</td>
                    <td>{item.assignmentCount}</td>
                    {isAdmin ? <td>{item.createdBy.displayName}</td> : null}
                    <td>
                      <div className="admin-toolbar-actions">
                        <Link className="admin-btn" href={`/admin/classes/${item.id}`}>
                          Mở
                        </Link>
                        <button
                          type="button"
                          className="admin-btn danger"
                          onClick={() => void deleteClass(item)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
