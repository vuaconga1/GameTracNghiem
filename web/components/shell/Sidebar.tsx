/* eslint-disable @next/next/no-img-element */

type SidebarProps = {
  mode: 'home' | 'game';
  filtersSlot?: React.ReactNode;
  gameNav?: React.ReactNode;
};

export function Sidebar({ mode, filtersSlot, gameNav }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/wewinlogo.png" alt="WeWIN Logo" />
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
