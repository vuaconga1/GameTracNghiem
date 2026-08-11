'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useAdminLeaveGuard } from '@/features/admin/AdminDirtyGuard';

type LocaleText = { vi: string; en: string };

const NAV: Array<{
  href: string;
  label: LocaleText;
  hint: LocaleText;
  icon: string;
  exact?: boolean;
}> = [
  {
    href: '/admin',
    label: { vi: 'Tổng quan', en: 'Overview' },
    hint: { vi: 'Bắt đầu nhanh', en: 'Quick start' },
    icon: 'fas fa-house',
    exact: true,
  },
  {
    href: '/admin/class-levels',
    label: { vi: 'Cấp / Lớp', en: 'Levels' },
    hint: { vi: 'Lớp 1, Lớp 2…', en: 'Grade 1, 2…' },
    icon: 'fas fa-layer-group',
  },
  {
    href: '/admin/courses',
    label: { vi: 'Khóa học', en: 'Courses' },
    hint: { vi: 'Danh sách unit', en: 'Unit list' },
    icon: 'fas fa-book',
  },
  {
    href: '/admin/ebooks',
    label: { vi: 'Sách PDF', en: 'PDF books' },
    hint: { vi: 'Upload bài học', en: 'Upload lessons' },
    icon: 'fas fa-file-pdf',
  },
  {
    href: '/admin/speaking',
    label: { vi: 'AI Speaking', en: 'AI Speaking' },
    hint: { vi: 'Chủ đề nói', en: 'Speaking topics' },
    icon: 'fas fa-microphone',
  },
  {
    href: '/admin/users',
    label: { vi: 'Tài khoản', en: 'Accounts' },
    hint: { vi: 'Học sinh & admin', en: 'Students & admins' },
    icon: 'fas fa-users',
  },
];

type AdminShellProps = {
  displayName: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

function txt(locale: 'vi' | 'en', value: LocaleText) {
  return locale === 'en' ? value.en : value.vi;
}

function AdminShellInner({ displayName, title, subtitle, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useI18n();
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
    <div className="admin-body admin-body-v2">
      <div className="admin-shell">
        <aside className="admin-nav" aria-label="Menu quản trị">
          <Link href="/admin" className="admin-nav-brand" onClick={guardNav}>
            <strong>WeWIN Admin</strong>
            <span>
              {locale === 'en'
                ? 'Edit like a spreadsheet'
                : 'Nhập liệu như Excel — không cần code'}
            </span>
          </Link>

          <div className="admin-nav-guide">
            <strong>{locale === 'en' ? 'Suggested order' : 'Làm lần lượt'}</strong>
            <p>
              {locale === 'en'
                ? '① Levels → ② Courses → ③ PDFs → ④ Open a unit'
                : '① Cấp lớp → ② Khóa/Unit → ③ PDF → ④ Mở unit gắn trang & câu hỏi'}
            </p>
          </div>

          <ul className="admin-nav-list">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? 'active' : undefined}
                    onClick={guardNav}
                    aria-current={active ? 'page' : undefined}
                  >
                    <i className={item.icon} aria-hidden="true" />
                    <span className="admin-nav-label">
                      <span className="admin-nav-title">{txt(locale, item.label)}</span>
                      <span className="admin-nav-hint">{txt(locale, item.hint)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="admin-nav-footer">
            <LanguageSwitcher />
            <Link href="/" onClick={guardNav}>
              <i className="fas fa-graduation-cap" aria-hidden="true" />{' '}
              {locale === 'en' ? 'Back to app' : 'Về trang học'}
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
              <div className="muted">
                {subtitle || t('admin.hello', { name: displayName })}
              </div>
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
