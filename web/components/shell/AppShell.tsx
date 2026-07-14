'use client';

import { SiteFooter } from './SiteFooter';
import { useSidebar } from './SidebarContext';

type AppShellProps = {
  sidebar?: React.ReactNode | null;
  header: React.ReactNode;
  children: React.ReactNode;
  /** Index pages must stretch; game-styles defaults .main to align-items:center (shrinks content). */
  layout?: 'index' | 'game';
};

export function AppShell({
  sidebar = null,
  header,
  children,
  layout = 'index',
}: AppShellProps) {
  const { open, setOpen } = useSidebar();
  const hasSidebar = Boolean(sidebar);
  const appClass = [
    'app',
    open && hasSidebar ? 'sidebar-open' : '',
    hasSidebar ? '' : 'no-sidebar',
  ]
    .filter(Boolean)
    .join(' ');
  const mainClassName = layout === 'index' ? 'main layout-index' : 'main layout-game';

  return (
    <div className="page-shell">
      <div className={appClass} id="appShell">
        {hasSidebar ? (
          <button
            type="button"
            className={open ? 'sidebar-backdrop' : 'sidebar-backdrop hidden'}
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          />
        ) : null}
        {sidebar}
        <main className={mainClassName}>
          {header}
          <div className="content">
            <div className="content-inner">{children}</div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
