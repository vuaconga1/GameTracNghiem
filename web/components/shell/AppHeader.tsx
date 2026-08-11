'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/components/i18n/I18nProvider';
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal';

import { useSidebar } from './SidebarContext';

type AppHeaderProps = {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  showMenu?: boolean;
};

export function AppHeader({
  isAuthenticated = true,
  isAdmin = false,
  showMenu = true,
}: AppHeaderProps) {
  const router = useRouter();
  const { open, toggle } = useSidebar();
  const { t } = useI18n();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          {showMenu ? (
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={t('common.openMenu')}
              aria-expanded={open}
              onClick={toggle}
            >
              <i className="fas fa-bars" />
            </button>
          ) : null}
        </div>

        <div className="header-actions">
          <LanguageSwitcher />
          {isAdmin ? (
            <Link className="action-item" href="/admin">
              <i className="fas fa-screwdriver-wrench" />
              <span>{t('common.admin')}</span>
            </Link>
          ) : null}
          {isAuthenticated ? (
            <>
              <Link className="action-item" href="/leaderboard">
                <i className="fas fa-chart-bar" />
                <span>{t('common.leaderboard')}</span>
              </Link>
              <button
                type="button"
                className="action-item"
                title={t('auth.changePasswordTitle')}
                onClick={() => setChangePasswordOpen(true)}
              >
                <i className="fas fa-key" />
                <span>{t('common.changePassword')}</span>
              </button>
              <button
                type="button"
                className="action-item action-item-logout"
                title={t('common.logout')}
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <i className="fas fa-right-from-bracket" />
                <span>{isLoggingOut ? t('common.loggingOut') : t('common.logout')}</span>
              </button>
            </>
          ) : (
            <Link className="action-item action-item-login" href="/login">
              <i className="fas fa-right-to-bracket" />
              <span>{t('common.login')}</span>
            </Link>
          )}
        </div>
      </header>
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  );
}
