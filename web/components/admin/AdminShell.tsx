'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  useAdminLeaveGuard,
} from '@/features/admin/AdminDirtyGuard';

const NAV = [
  { href: '/admin', labelKey: 'admin.dashboard', icon: 'fas fa-gauge-high', exact: true },
  { href: '/admin/class-levels', labelKey: 'admin.classLevels', icon: 'fas fa-layer-group' },
  { href: '/admin/courses', labelKey: 'admin.courses', icon: 'fas fa-book' },
  { href: '/admin/ebooks', labelKey: 'admin.ebooks', icon: 'fas fa-book-open' },
  { href: '/admin/speaking', labelKey: 'admin.speaking', icon: 'fas fa-microphone' },
  { href: '/admin/users', labelKey: 'admin.accounts', icon: 'fas fa-users' },
] as const;

type AdminShellProps = {
  displayName: string;
  title: string;
  children: React.ReactNode;
};

function AdminShellInner({ displayName, title, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [loggingOut, setLoggingOut] = useState(false);
  const { confirmLeave } = useAdminLeaveGuard();

  function guardNav(event: React.MouseEvent) {
    if (!confirmLeave()) event.preventDefault();
  }

  async function logout() {
    if (loggingOut) return;
    if (!confirmLeave()) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <div className="admin-body">
      <div className="admin-shell">
        <aside className="admin-nav">
          <Link href="/admin" className="admin-nav-brand" onClick={guardNav}>
            <strong>WeWIN Admin</strong>
            <span>{t('admin.subtitle')}</span>
          </Link>
          <ul className="admin-nav-list">
            {NAV.map((item) => {
              const exact = 'exact' in item && item.exact;
              const active = exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? 'active' : undefined}
                    onClick={guardNav}
                  >
                    <i className={item.icon} aria-hidden="true" />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="admin-nav-footer">
            <LanguageSwitcher />
            <Link href="/" onClick={guardNav}>
              <i className="fas fa-graduation-cap" aria-hidden="true" /> {t('admin.backToApp')}
            </Link>
            <button type="button" onClick={() => void logout()} disabled={loggingOut}>
              <i className="fas fa-right-from-bracket" aria-hidden="true" />{' '}
              {loggingOut ? t('common.loggingOut') : t('common.logout')}
            </button>
          </div>
        </aside>
        <div className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1>{title}</h1>
              <div className="muted">{t('admin.hello', { name: displayName })}</div>
            </div>
          </div>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return <AdminShellInner {...props} />;
}
