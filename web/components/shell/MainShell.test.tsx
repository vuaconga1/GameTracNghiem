import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/courses/course-1',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { MainShell } from './MainShell';
import { SidebarProvider } from './SidebarContext';

describe('MainShell course pages', () => {
  it('renders the profile sidebar with home and active course navigation', () => {
    const html = renderToStaticMarkup(
      createElement(
        SidebarProvider,
        null,
        createElement(
          MainShell,
          {
            displayName: 'Quản trị viên',
            level: 2,
            tier: 1,
            expInLevel: 1,
            expToNextLevel: 204,
            progressPercent: 1,
          },
          createElement('div', null, 'Course detail')
        )
      )
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
});
