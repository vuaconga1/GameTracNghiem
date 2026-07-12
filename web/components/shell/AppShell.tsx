'use client';

import { SiteFooter } from './SiteFooter';
import { useSidebar } from './SidebarContext';

type AppShellProps = {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  /** Index pages must stretch; game-styles defaults .main to align-items:center (shrinks content). */
  layout?: 'index' | 'game';
};

export function AppShell({
  sidebar,
  header,
  children,
  layout = 'index',
}: AppShellProps) {
  const { open, setOpen } = useSidebar();
  const mainClassName = layout === 'index' ? 'main layout-index' : 'main';

  return (
    <div className="page-shell">
      <div className={open ? 'app sidebar-open' : 'app'} id="appShell">
        <button
          type="button"
          className={open ? 'sidebar-backdrop' : 'sidebar-backdrop hidden'}
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
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
