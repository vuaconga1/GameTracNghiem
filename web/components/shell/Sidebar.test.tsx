import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders game navigation in the legacy sidebar shell', () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        mode: 'game',
        displayName: 'Bé Chi',
        gameNav: createElement(
          'a',
          { className: 'nav-item active', href: '/games/grammar/demo' },
          'Ngữ pháp'
        ),
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
        displayName: 'Bé Chi',
        filtersSlot: createElement('div', { id: 'sidebar-filters-root' }),
      })
    );

    expect(html).toContain('class="sidebar-filters filters"');
    expect(html).toContain('id="sidebar-filters-root"');
    expect(html).not.toContain('class="sidebar-nav"');
  });

  it('renders a stacked user profile with sidebar rank badge below the logo', () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        mode: 'home',
        displayName: 'Bé Chi',
        level: 2,
        tier: 1,
        expInLevel: 1204,
        expToNextLevel: 2000,
        progressPercent: 60,
        filtersSlot: createElement('div', { id: 'sidebar-filters-root' }),
      })
    );

    expect(html).toContain('class="sidebar-user"');
    expect(html).toContain('class="sidebar-user-avatar"');
    expect(html).toContain('Bé Chi');
    expect(html).toContain('class="badge-rank badge-rank--sidebar"');
    expect(html).toContain('class="badge-rank-head"');
    expect(html).toContain('src="/icons/rank/tier-01.svg"');
    expect(html).toContain('Cấp 2');
    expect(html).toContain('1.204 / 2.000 EXP');
  });
});
