'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useI18n } from '@/components/i18n/I18nProvider';
import { PlayerProvider } from '@/components/player/PlayerContext';
import { findGameByPathname } from '@/lib/gameCatalog';

import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';
import { Sidebar } from './Sidebar';
import { useSidebar } from './SidebarContext';

type MainShellProps = {
  displayName?: string;
  isAuthenticated?: boolean;
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
  isAuthenticated = false,
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
  const { t } = useI18n();
  const activeGame = findGameByPathname(pathname);
  const isGamePage = Boolean(activeGame);
  const isHome = pathname === '/';
  const isCoursePage = pathname === '/courses' || pathname.startsWith('/courses/');
  const isLeaderboard = pathname === '/leaderboard' || pathname.startsWith('/leaderboard/');

  const userProps = {
    displayName: displayName || t('shell.guest'),
    isGuest: !isAuthenticated,
    level,
    tier,
    expInLevel,
    expToNextLevel,
    progressPercent,
  };

  const gameLabel = activeGame ? t(`games.${activeGame.key}`) : '';

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
              <span>{t('common.home')}</span>
            </Link>
            <Link className="nav-item active" href={pathname} onClick={() => setOpen(false)}>
              <i className={activeGame.icon} />
              <span>{gameLabel}</span>
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
              <span>{t('common.home')}</span>
            </Link>
            <Link className="nav-item active" href={pathname} onClick={() => setOpen(false)}>
              <i className="fas fa-graduation-cap" />
              <span>{t('common.courses')}</span>
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
              <span>{t('common.home')}</span>
            </Link>
            <Link className="nav-item active" href="/leaderboard" onClick={() => setOpen(false)}>
              <i className="fas fa-trophy" />
              <span>{t('common.leaderboard')}</span>
            </Link>
          </>
        }
      />
    );
  }

  return (
    <PlayerProvider kind={isAuthenticated ? 'authenticated' : 'guest'}>
      <AppShell
        layout={isCoursePage ? 'course' : isGamePage || isLeaderboard ? 'game' : 'index'}
        sidebar={sidebar}
        header={
          <AppHeader
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            showMenu={Boolean(sidebar)}
          />
        }
      >
        {children}
      </AppShell>
    </PlayerProvider>
  );
}
