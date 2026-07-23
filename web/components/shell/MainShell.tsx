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
  level?: number;
  tier?: number;
  expInLevel?: number;
  expToNextLevel?: number | null;
  progressPercent?: number;
  children: React.ReactNode;
};

export function MainShell({
  displayName,
  isAdmin = false,
  level,
  tier,
  expInLevel,
  expToNextLevel,
  progressPercent,
  children,
}: MainShellProps) {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const activeGame = findGameByPathname(pathname);
  const isGamePage = Boolean(activeGame);
  const isHome = pathname === '/';
  const isCoursePage = pathname === '/courses' || pathname.startsWith('/courses/');
  const isLeaderboard = pathname === '/leaderboard' || pathname.startsWith('/leaderboard/');

  const userProps = {
    displayName,
    level,
    tier,
    expInLevel,
    expToNextLevel,
    progressPercent,
  };

  // Home: level filters. Course / games / leaderboard: compact nav with Trang chủ.
  let sidebar: React.ReactNode = null;
  if (isGamePage && activeGame) {
    sidebar = (
      <Sidebar
        mode="game"
        {...userProps}
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
    sidebar = <Sidebar mode="home" {...userProps} filtersSlot={<div id="sidebar-filters-root" />} />;
  } else if (isCoursePage) {
    sidebar = (
      <Sidebar
        mode="game"
        {...userProps}
        gameNav={
          <>
            <Link className="nav-item" href="/" onClick={() => setOpen(false)}>
              <i className="fas fa-home" />
              <span>Trang chủ</span>
            </Link>
            <Link className="nav-item active" href={pathname} onClick={() => setOpen(false)}>
              <i className="fas fa-graduation-cap" />
              <span>Khóa học</span>
            </Link>
          </>
        }
      />
    );
  } else if (isLeaderboard) {
    sidebar = (
      <Sidebar
        mode="game"
        {...userProps}
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
      layout={isCoursePage ? 'course' : isGamePage || isLeaderboard ? 'game' : 'index'}
      sidebar={sidebar}
      header={<AppHeader isAdmin={isAdmin} showMenu={Boolean(sidebar)} />}
    >
      {children}
    </AppShell>
  );
}
