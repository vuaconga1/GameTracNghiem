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

  // Home keeps filters sidebar. Unit/leaderboard: full width (no empty left rail).
  // Games keep a compact game nav sidebar.
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
  }

  return (
    <AppShell
      layout={isGamePage ? 'game' : 'index'}
      sidebar={sidebar}
      header={
        <AppHeader displayName={displayName} isAdmin={isAdmin} showMenu={Boolean(sidebar)} />
      }
    >
      {children}
    </AppShell>
  );
}
