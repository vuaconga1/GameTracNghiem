'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSidebar } from './SidebarContext';

type AppHeaderProps = {
  displayName: string;
};

export function AppHeader({ displayName }: AppHeaderProps) {
  const router = useRouter();
  const { open, toggle } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <header className="header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Mở menu"
          aria-expanded={open}
          onClick={toggle}
        >
          <i className="fas fa-bars" />
        </button>
        <span className="header-title">
          WeWIN - <span>{displayName}</span>
        </span>
        <span className="badge-rank">
          <i className="fas fa-shield-alt" />
          <span>—</span>
        </span>
      </div>

      <div className="header-actions">
        <Link className="action-item" href="/leaderboard">
          <i className="fas fa-chart-bar" />
          <span>Xếp hạng</span>
        </Link>
        <button
          type="button"
          className="action-item action-item-logout"
          title="Đăng xuất"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <i className="fas fa-right-from-bracket" />
          <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
        </button>
      </div>
    </header>
  );
}
