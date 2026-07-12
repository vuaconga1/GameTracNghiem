import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

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
});
