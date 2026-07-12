import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseFilters } from './CourseFilters';

describe('CourseFilters', () => {
  it('renders class and level filter chips with active state', () => {
    const html = renderToStaticMarkup(
      createElement(CourseFilters, {
        classes: ['Lớp 1', 'Lớp 2'],
        levels: ['A1', 'A2'],
        className: 'Lớp 1',
        levelName: '',
        onClassNameChange: () => undefined,
        onLevelNameChange: () => undefined,
      })
    );

    expect(html).toContain('class="filter-grid"');
    expect(html).toContain('class="filter-item active"');
    expect(html).toContain('data-filter-type="class"');
    expect(html).toContain('data-filter-type="level"');
    expect(html).toContain('data-class="Lớp 1"');
    expect(html).toContain('data-level="A1"');
    expect(html).toContain('Tất cả');
    expect(html).not.toContain('<select');
  });
});
