'use client';

import { SiteFooter } from './SiteFooter';
import { useSidebar } from './SidebarContext';

type AppShellProps = {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ sidebar, header, children }: AppShellProps) {
  const { open, setOpen } = useSidebar();

  return (
    <div className="page-shell">
      <div className={open ? 'app sidebar-open' : 'app'}>
        <button
          type="button"
          className={open ? 'sidebar-backdrop' : 'sidebar-backdrop hidden'}
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
        {sidebar}
        <main className="main">
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
