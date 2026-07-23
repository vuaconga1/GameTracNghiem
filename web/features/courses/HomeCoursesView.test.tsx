import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import { HomeCoursesView } from './HomeCoursesView';

describe('HomeCoursesView', () => {
  it('renders the legacy courses area header while loading', () => {
    const html = renderToStaticMarkup(createElement(HomeCoursesView));

    expect(html).toContain('id="view-courses"');
    expect(html).toContain('class="courses-area"');
    expect(html).toContain('class="courses-header"');
    expect(html).toContain('class="courses-header-icon"');
    expect(html).toContain('class="fas fa-graduation-cap"');
    expect(html).toContain('class="courses-header-text"');
    expect(html).toContain('Khóa học');
    expect(html).toContain('class="fas fa-chevron-down"');
    expect(html).toContain('class="fas fa-gear fa-spin"');
  });

  it('uses initial data without showing the loading state', () => {
    const html = renderToStaticMarkup(
      createElement(HomeCoursesView, {
        initialData: {
          courses: [
            {
              id: 'course-1',
              name: 'Starter A',
              levelName: 'A2',
              completionPercent: 40,
              backgroundImageUrl: null,
            },
          ],
          filters: { levels: ['A1', 'A2'] },
          selectedLevelName: 'A2',
        },
      })
    );

    expect(html).toContain('Starter A');
    expect(html).not.toContain('class="fas fa-gear fa-spin"');
  });
});
