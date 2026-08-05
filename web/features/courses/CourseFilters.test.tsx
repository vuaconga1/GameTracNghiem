import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@/components/i18n/I18nProvider';
import { SidebarProvider } from '@/components/shell/SidebarContext';

import { CourseFilters } from './CourseFilters';

function renderWithProviders(node: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { initialLocale: 'vi' },
      createElement(SidebarProvider, null, node),
    ),
  );
}

describe('CourseFilters', () => {
  it('renders only concrete level filters', () => {
    const html = renderWithProviders(
      createElement(CourseFilters, {
        levels: ['A1', 'A2', ''],
        levelName: 'A1',
        onLevelNameChange: () => undefined,
      }),
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

  it('formats Lớp chips for English locale', () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        { initialLocale: 'en' },
        createElement(
          SidebarProvider,
          null,
          createElement(CourseFilters, {
            levels: ['Lớp 4', 'Lớp 9'],
            levelName: 'Lớp 4',
            onLevelNameChange: () => undefined,
          }),
        ),
      ),
    );

    expect(html).toContain('Grade 4');
    expect(html).toContain('Grade 9');
    expect(html).toContain('data-level="Lớp 4"');
    expect(html).not.toContain('>Lớp 4<');
  });
});
