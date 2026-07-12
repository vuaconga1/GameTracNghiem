'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';
import { Sidebar } from './Sidebar';
import { useSidebar } from './SidebarContext';

type MainShellProps = {
  displayName: string;
  children: React.ReactNode;
};

export function MainShell({ displayName, children }: MainShellProps) {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const isGrammarGame = pathname.startsWith('/games/grammar');

  const sidebar = isGrammarGame ? (
    <Sidebar
      mode="game"
      gameNav={
        <>
          <Link className="nav-item" href="/" onClick={() => setOpen(false)}>
            <i className="fas fa-home" />
            <span>Trang chủ</span>
          </Link>
          <Link className="nav-item active" href={pathname} onClick={() => setOpen(false)}>
            <i className="fas fa-spell-check" />
            <span>Ngữ pháp</span>
          </Link>
        </>
      }
    />
  ) : (
    <Sidebar mode="home" filtersSlot={<div id="sidebar-filters-root" />} />
  );

  return (
    <AppShell
      layout={isGrammarGame ? 'game' : 'index'}
      sidebar={sidebar}
      header={<AppHeader displayName={displayName} />}
    >
      {children}
    </AppShell>
  );
}
