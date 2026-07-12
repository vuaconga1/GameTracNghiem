import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders game navigation in the legacy sidebar shell', () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        mode: 'game',
        gameNav: createElement('a', { className: 'nav-item active', href: '/games/grammar/demo' }, 'Ngữ pháp'),
      })
    );

    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="sidebar-logo"');
    expect(html).toContain('src="/wewinlogo.png"');
    expect(html).toContain('class="sidebar-nav"');
    expect(html).toContain('Ngữ pháp');
    expect(html).toContain('Version: 2.3.219');
  });

  it('renders home filters in the legacy filters container', () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        mode: 'home',
        filtersSlot: createElement('div', { id: 'sidebar-filters-root' }),
      })
    );

    expect(html).toContain('class="sidebar-filters filters"');
    expect(html).toContain('id="sidebar-filters-root"');
    expect(html).not.toContain('class="sidebar-nav"');
  });
});
