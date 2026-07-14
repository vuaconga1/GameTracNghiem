/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';

type SidebarProps = {
  mode: 'home' | 'game';
  filtersSlot?: React.ReactNode;
  gameNav?: React.ReactNode;
};

export function Sidebar({ mode, filtersSlot, gameNav }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" aria-label="Về trang chủ WeWIN">
        <img src="/wewinlogo.png" alt="WeWIN Logo" />
      </Link>

      {mode === 'game' ? (
        <nav className="sidebar-nav">{gameNav}</nav>
      ) : (
        <div className="sidebar-filters filters">{filtersSlot}</div>
      )}

      <div className="sidebar-version">Version: 2.3.219</div>
    </aside>
  );
}
