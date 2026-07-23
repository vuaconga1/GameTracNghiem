/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';

import { RankBadge } from './RankBadge';

type SidebarProps = {
  mode: 'home' | 'game';
  displayName: string;
  level?: number;
  tier?: number;
  expInLevel?: number;
  expToNextLevel?: number | null;
  progressPercent?: number;
  filtersSlot?: React.ReactNode;
  gameNav?: React.ReactNode;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Sidebar({
  mode,
  displayName,
  level,
  tier,
  expInLevel,
  expToNextLevel,
  progressPercent,
  filtersSlot,
  gameNav,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" aria-label="Về trang chủ WeWIN">
        <img src="/wewinlogo.png" alt="WeWIN Logo" />
      </Link>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar" aria-hidden="true">
          {initialsFromName(displayName)}
        </div>
        <div className="sidebar-user-meta">
          <div className="sidebar-user-name">{displayName}</div>
          <RankBadge
            variant="sidebar"
            level={level}
            tier={tier}
            expInLevel={expInLevel}
            expToNextLevel={expToNextLevel}
            progressPercent={progressPercent}
          />
        </div>
      </div>

      {mode === 'game' ? (
        <nav className="sidebar-nav">{gameNav}</nav>
      ) : (
        <div className="sidebar-filters filters">{filtersSlot}</div>
      )}

      <div className="sidebar-version">Version: 2.3.219</div>
    </aside>
  );
}
