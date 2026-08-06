import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/components/i18n/I18nProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { AppHeader } from './AppHeader';
import { SidebarProvider } from './SidebarContext';

function renderHeader(props: { isAdmin?: boolean; isAuthenticated?: boolean } = {}) {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { initialLocale: 'vi' },
      createElement(SidebarProvider, null, createElement(AppHeader, props)),
    ),
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header actions without brand title or rank badge', () => {
    const html = renderHeader({ isAdmin: true });

    expect(html).not.toContain('header-title');
    expect(html).not.toContain('Quản trị viên');
    expect(html).toContain('Quản trị');
    expect(html).toContain('Xếp hạng');
    expect(html).toContain('Đăng xuất');
    expect(html).not.toContain('class="badge-rank"');
    expect(html).not.toContain('/icons/rank/');
  });

  it('shows a login CTA and hides student-only actions for guests', () => {
    const html = renderHeader({ isAuthenticated: false });

    expect(html).toContain('href="/login"');
    expect(html).toContain('Đăng nhập');
    expect(html).not.toContain('href="/leaderboard"');
    expect(html).not.toContain('Đăng xuất');
  });
});
