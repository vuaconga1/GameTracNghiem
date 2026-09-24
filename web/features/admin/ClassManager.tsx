'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

const PAGE_SIZE = 20;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

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
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const filteredItems = useMemo(() => {
    if (!items) return null;
    const q = normalizeSearch(filter);
    if (!q) return items;
    return items.filter((item) => normalizeSearch(item.name).includes(q));
  }, [filter, items]);

  const totalPages = filteredItems
    ? Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
    : 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    if (!filteredItems) return null;
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

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

  const rangeLabel =
    filteredItems && filteredItems.length > 0
      ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredItems.length)} / ${filteredItems.length} lớp`
      : null;

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
            placeholder="Tên lớp (vd: WW00016 — IELTS INTENSIVE)"
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

      <div className="admin-toolbar" style={{ marginTop: 8 }}>
        <div className="admin-toolbar-actions" style={{ flexWrap: 'wrap', gap: 10, width: '100%' }}>
          <input
            className="admin-toolbar-input"
            style={{ flex: '1 1 240px', minWidth: 200 }}
            placeholder="Tìm theo tên lớp (vd: WW00016, IELTS…)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Tìm kiếm theo tên lớp"
          />
          {filter ? (
            <button type="button" className="admin-btn" onClick={() => setFilter('')}>
              Xóa lọc
            </button>
          ) : null}
        </div>
      </div>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel">
        {items === null || filteredItems === null || pageItems === null ? (
          <DataLoading />
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có lớp nào. Hãy tạo lớp đầu tiên ở trên.</div>
        ) : filteredItems.length === 0 ? (
          <div className="admin-empty">
            Không có lớp khớp “{filter.trim()}”. Thử từ khóa khác hoặc xóa lọc.
          </div>
        ) : (
          <>
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
                  {pageItems.map((item) => (
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

            <div
              className="admin-toolbar-actions"
              style={{
                marginTop: 14,
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span style={{ opacity: 0.8, fontSize: 14 }}>{rangeLabel}</span>
              <div className="admin-toolbar-actions" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </button>
                <span style={{ alignSelf: 'center', fontSize: 14 }}>
                  Trang {page}/{totalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
