import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseFilters } from './CourseFilters';

describe('CourseFilters', () => {
  it('renders Tất cả plus level filters only', () => {
    const html = renderToStaticMarkup(
      createElement(CourseFilters, {
        levels: ['A1', 'A2', ''],
        levelName: 'A1',
        onLevelNameChange: () => undefined,
      })
    );

    expect(html).toContain('class="filter-grid"');
    expect(html).toContain('Cấp độ');
    expect(html).toContain('class="filter-item active"');
    expect(html).toContain('data-filter-type="level"');
    expect(html).toContain('data-level="A1"');
    expect(html).toContain('Tất cả');
    expect(html.match(/Tất cả/g)?.length).toBe(1);
    expect(html).not.toContain('data-filter-type="class"');
    expect(html).not.toContain('<select');
  });
});
