import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from './SiteFooter';

describe('SiteFooter', () => {
  it('renders the legacy footer structure and brand links', () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));

    expect(html).toContain('class="site-footer"');
    expect(html).toContain('class="footer-inner"');
    expect(html).toContain('src="/wewinlogo.png"');
    expect(html).toContain('WeWIN Education');
    expect(html).toContain('WEWIN BỨT PHÁ TIẾNG ANH');
    expect(html).toContain('href="https://wewin.edu.vn"');
    expect(html).toContain('officemanager@wewin.edu.vn');
    expect(html).toContain('© 2026');
    expect(html).toContain('footer-contact-main');
    expect(html).toContain('footer-contact-extra');
  });
});
