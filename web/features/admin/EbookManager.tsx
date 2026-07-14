'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';

type EbookItem = {
  id: string;
  title: string;
  originalName: string;
  pageCount: number | null;
  active: boolean;
  createdAt: string;
};

export function EbookManager({ displayName }: { displayName: string }) {
  const [items, setItems] = useState<EbookItem[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/ebooks');
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Không tải được danh sách sách');
      return;
    }
    setItems(data.items as EbookItem[]);
    setError('');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn file PDF');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.set('title', title.trim() || file.name.replace(/\.pdf$/i, ''));
      form.set('file', file);
      const res = await fetch('/api/admin/ebooks', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Upload thất bại');
        return;
      }
      setTitle('');
      setFile(null);
      setMessage(`Đã thêm sách “${data.item.title}”`);
      await load();
    } catch {
      setError('Lỗi mạng khi upload');
    } finally {
      setUploading(false);
    }
  }

  async function patchEbook(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/ebooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Lưu thất bại');
        return;
      }
      setMessage('Đã lưu');
      await load();
    } catch {
      setError('Lỗi mạng khi lưu');
    } finally {
      setSavingId(null);
    }
  }

  async function removeEbook(item: EbookItem) {
    if (!window.confirm(`Ẩn sách “${item.title}” khỏi quản trị?`)) return;
    setSavingId(item.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/ebooks/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không ẩn được');
        return;
      }
      setMessage(data.message || 'Đã ẩn sách');
      await load();
    } catch {
      setError('Lỗi mạng khi ẩn sách');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell displayName={displayName} title="Sách bài tập">
      <div className="admin-panel" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Thêm sách PDF</h2>
        <p className="help" style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
          Upload một file PDF nguyên (không cần cắt trang). Sau đó gắn khoảng trang cho từng unit ở
          chi tiết khóa học.
        </p>
        <form className="admin-toolbar" onSubmit={(e) => void handleCreate(e)}>
          <input
            className="sheet-input"
            style={{ minWidth: 220, border: '1px solid var(--admin-border)', background: '#fff' }}
            placeholder="Tên sách (vd. Grade 8 HK1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button type="submit" className="admin-btn primary" disabled={uploading || !file}>
            {uploading ? 'Đang tải lên...' : 'Thêm sách'}
          </button>
        </form>
      </div>

      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel sheet-panel">
        {!items ? (
          <DataLoading />
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có sách. Upload PDF bên trên để bắt đầu.</div>
        ) : (
          <div className="sheet-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th>Tên sách</th>
                  <th>File</th>
                  <th style={{ width: '110px' }}>Số trang</th>
                  <th style={{ width: '80px' }}>Dùng</th>
                  <th style={{ width: '160px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        className="sheet-input"
                        defaultValue={item.title}
                        disabled={savingId === item.id}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== item.title) {
                            void patchEbook(item.id, { title: next });
                          }
                        }}
                      />
                    </td>
                    <td>
                      <span style={{ color: 'var(--admin-muted)', fontSize: '0.85rem' }}>
                        {item.originalName}
                      </span>
                    </td>
                    <td>
                      <input
                        className="sheet-input"
                        type="number"
                        min={1}
                        placeholder="VD. 120"
                        defaultValue={item.pageCount ?? ''}
                        disabled={savingId === item.id}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === '' ? null : Number(raw);
                          if (next !== item.pageCount) {
                            void patchEbook(item.id, { pageCount: next });
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="sheet-check"
                        checked={item.active}
                        disabled={savingId === item.id}
                        onChange={(e) =>
                          void patchEbook(item.id, { active: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn danger"
                        disabled={savingId === item.id}
                        onClick={() => void removeEbook(item)}
                      >
                        Xóa
                      </button>
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
