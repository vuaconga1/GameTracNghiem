'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSidebar } from './SidebarContext';

type AppHeaderProps = {
  isAdmin?: boolean;
  showMenu?: boolean;
};

export function AppHeader({ isAdmin = false, showMenu = true }: AppHeaderProps) {
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
        {showMenu ? (
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Mở menu"
            aria-expanded={open}
            onClick={toggle}
          >
            <i className="fas fa-bars" />
          </button>
        ) : null}
      </div>

      <div className="header-actions">
        {isAdmin ? (
          <Link className="action-item" href="/admin">
            <i className="fas fa-screwdriver-wrench" />
            <span>Quản trị</span>
          </Link>
        ) : null}
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
