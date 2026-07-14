'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  useAdminLeaveGuard,
} from '@/features/admin/AdminDirtyGuard';

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: 'fas fa-gauge-high', exact: true },
  { href: '/admin/class-levels', label: 'Cấp độ', icon: 'fas fa-layer-group' },
  { href: '/admin/courses', label: 'Khóa học', icon: 'fas fa-book' },
  { href: '/admin/ebooks', label: 'Sách bài tập', icon: 'fas fa-book-open' },
  { href: '/admin/users', label: 'Tài khoản', icon: 'fas fa-users' },
];

type AdminShellProps = {
  displayName: string;
  title: string;
  children: React.ReactNode;
};

function AdminShellInner({ displayName, title, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { confirmLeave } = useAdminLeaveGuard();

  function guardNav(event: React.MouseEvent) {
    if (!confirmLeave()) event.preventDefault();
  }

  async function logout() {
    if (loggingOut) return;
    if (!confirmLeave()) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <div className="admin-body">
      <div className="admin-shell">
        <aside className="admin-nav">
          <Link href="/admin" className="admin-nav-brand" onClick={guardNav}>
            <strong>WeWIN Admin</strong>
            <span>Quản lý nội dung</span>
          </Link>
          <ul className="admin-nav-list">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? 'active' : undefined}
                    onClick={guardNav}
                  >
                    <i className={item.icon} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="admin-nav-footer">
            <Link href="/" onClick={guardNav}>
              <i className="fas fa-graduation-cap" aria-hidden="true" /> Về trang học
            </Link>
            <button type="button" onClick={() => void logout()} disabled={loggingOut}>
              <i className="fas fa-right-from-bracket" aria-hidden="true" />{' '}
              {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </button>
          </div>
        </aside>
        <div className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1>{title}</h1>
              <div className="muted">Xin chào, {displayName}</div>
            </div>
          </div>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return <AdminShellInner {...props} />;
}
