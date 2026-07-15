'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { findGameByPathname } from '@/lib/gameCatalog';

import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';
import { Sidebar } from './Sidebar';
import { useSidebar } from './SidebarContext';

type MainShellProps = {
  displayName: string;
  isAdmin?: boolean;
  children: React.ReactNode;
};

export function MainShell({ displayName, isAdmin = false, children }: MainShellProps) {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const activeGame = findGameByPathname(pathname);
  const isGamePage = Boolean(activeGame);
  const isHome = pathname === '/';
  const isLeaderboard = pathname === '/leaderboard' || pathname.startsWith('/leaderboard/');

  // Home: level filters. Games / leaderboard: compact nav with Trang chủ.
  // Course detail (Bài học / Bài tập): full width — no sidebar.
  let sidebar: React.ReactNode = null;
  if (isGamePage && activeGame) {
    sidebar = (
      <Sidebar
        mode="game"
        gameNav={
          <>
            <Link className="nav-item" href="/" onClick={() => setOpen(false)}>
              <i className="fas fa-home" />
              <span>Trang chủ</span>
            </Link>
            <Link className="nav-item active" href={pathname} onClick={() => setOpen(false)}>
              <i className={activeGame.icon} />
              <span>{activeGame.label}</span>
            </Link>
          </>
        }
      />
    );
  } else if (isHome) {
    sidebar = <Sidebar mode="home" filtersSlot={<div id="sidebar-filters-root" />} />;
  } else if (isLeaderboard) {
    sidebar = (
      <Sidebar
        mode="game"
        gameNav={
          <>
            <Link className="nav-item" href="/" onClick={() => setOpen(false)}>
              <i className="fas fa-home" />
              <span>Trang chủ</span>
            </Link>
            <Link className="nav-item active" href="/leaderboard" onClick={() => setOpen(false)}>
              <i className="fas fa-trophy" />
              <span>Xếp hạng</span>
            </Link>
          </>
        }
      />
    );
  }

  return (
    <AppShell
      layout={isGamePage || isLeaderboard ? 'game' : 'index'}
      sidebar={sidebar}
      header={
        <AppHeader displayName={displayName} isAdmin={isAdmin} showMenu={Boolean(sidebar)} />
      }
    >
      {children}
    </AppShell>
  );
}
