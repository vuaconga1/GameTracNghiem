'use client';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/components/i18n/I18nProvider';

const usePathname = vi.fn(() => '/courses/course-1');

vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { MainShell } from './MainShell';
import { SidebarProvider } from './SidebarContext';

describe('MainShell course pages', () => {
  beforeEach(() => {
    usePathname.mockReturnValue('/courses/course-1');
  });

  it('renders the profile sidebar with home and active course navigation', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SidebarProvider>
          <MainShell
            displayName="Quản trị viên"
            isAuthenticated
            level={2}
            tier={1}
            expInLevel={1}
            expToNextLevel={204}
            progressPercent={1}
          >
            <div>Course detail</div>
          </MainShell>
        </SidebarProvider>
      </I18nProvider>,
    );

    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="main layout-course"');
    expect(html).toContain('href="/"');
    expect(html).toContain('Trang chủ');
    expect(html).toContain('href="/courses/course-1"');
    expect(html).toContain('class="nav-item active"');
    expect(html).toContain('Khóa học');
    expect(html).toContain('Course detail');
  });

  it('gives speaking pages a mobile drawer sidebar', () => {
    usePathname.mockReturnValue('/speaking/course-1');
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SidebarProvider>
          <MainShell displayName="Học sinh" isAuthenticated>
            <div>Speaking hub</div>
          </MainShell>
        </SidebarProvider>
      </I18nProvider>,
    );

    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="main layout-game"');
    expect(html).toContain('mobile-menu-btn');
    expect(html).toContain('AI Speaking');
    expect(html).toContain('Speaking hub');
  });
});
