'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';

export function AccountSettings({
  displayName,
  username,
  isAdmin,
}: {
  displayName: string;
  username: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [currentUsername, setCurrentUsername] = useState(username);
  const [newUsername, setNewUsername] = useState(username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const trimmedUsername = newUsername.trim();
    const usernameChanged = trimmedUsername !== currentUsername;
    const passwordChanged = Boolean(newPassword);

    if (!currentPassword) {
      setMessage('');
      setError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!usernameChanged && !passwordChanged) {
      setMessage('');
      setError('Nhập username mới và/hoặc mật khẩu mới để cập nhật');
      return;
    }
    if (usernameChanged && !trimmedUsername) {
      setMessage('');
      setError('Username mới không được để trống');
      return;
    }
    if (passwordChanged && newPassword !== confirmPassword) {
      setMessage('');
      setError('Xác nhận mật khẩu mới không khớp');
      return;
    }
    if (passwordChanged && !newPassword.trim()) {
      setMessage('');
      setError('Mật khẩu mới không được để trống');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: usernameChanged ? trimmedUsername : undefined,
          newPassword: passwordChanged ? newPassword : undefined,
          confirmPassword: passwordChanged ? confirmPassword : undefined,
        }),
      });
      let data: { success?: boolean; message?: string; item?: { username?: string } };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError('Máy chủ trả về phản hồi không hợp lệ. Thử lại.');
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || `Không cập nhật được tài khoản (mã ${res.status})`);
        return;
      }

      const nextUsername = data.item?.username || trimmedUsername;
      setCurrentUsername(nextUsername);
      setNewUsername(nextUsername);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(data.message || 'Đã cập nhật tài khoản');
      router.refresh();
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      displayName={displayName}
      title="Thông tin tài khoản"
      subtitle="Đổi username hoặc mật khẩu đăng nhập của bạn"
      isAdmin={isAdmin}
    >
      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel">
        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="admin-field">
            <label htmlFor="account-current-username">Username hiện tại</label>
            <input
              id="account-current-username"
              className="admin-toolbar-input"
              value={currentUsername}
              readOnly
              disabled
              autoComplete="username"
            />
            <span className="help">Chỉ xem — nhập username mới bên dưới nếu muốn đổi</span>
          </div>

          <div className="admin-field">
            <label htmlFor="account-new-username">Username mới</label>
            <input
              id="account-new-username"
              className="admin-toolbar-input"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value);
                if (error) setError('');
              }}
              autoComplete="username"
              maxLength={80}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="account-current-password">Mật khẩu hiện tại</label>
            <input
              id="account-current-password"
              className="admin-toolbar-input"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (error) setError('');
              }}
              autoComplete="current-password"
              required
            />
            <span className="help">Bắt buộc để xác nhận bạn là chủ tài khoản</span>
          </div>

          <div className="admin-form-row">
            <div className="admin-field">
              <label htmlFor="account-new-password">Mật khẩu mới</label>
              <input
                id="account-new-password"
                className="admin-toolbar-input"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
                placeholder="Để trống nếu chỉ đổi username"
              />
            </div>
            <div className="admin-field">
              <label htmlFor="account-confirm-password">Xác nhận mật khẩu mới</label>
              <input
                id="account-confirm-password"
                className="admin-toolbar-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn primary" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
