import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SidebarProvider } from '@/components/shell/SidebarContext';

import { CourseFilters } from './CourseFilters';

describe('CourseFilters', () => {
  it('renders only concrete level filters', () => {
    const html = renderToStaticMarkup(
      createElement(
        SidebarProvider,
        null,
        createElement(CourseFilters, {
          levels: ['A1', 'A2', ''],
          levelName: 'A1',
          onLevelNameChange: () => undefined,
        })
      )
    );

    expect(html).toContain('class="filter-grid"');
    expect(html).toContain('Cấp độ');
    expect(html).toContain('class="filter-item active"');
    expect(html).toContain('data-filter-type="level"');
    expect(html).toContain('data-level="A1"');
    expect(html).toContain('data-level="A2"');
    expect(html).not.toContain('Tất cả');
    expect(html).not.toContain('data-level=""');
    expect(html).not.toContain('data-filter-type="class"');
    expect(html).not.toContain('<select');
  });
});
