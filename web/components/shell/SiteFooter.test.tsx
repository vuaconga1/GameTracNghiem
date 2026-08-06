import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@/components/i18n/I18nProvider';
import { SiteFooter } from './SiteFooter';

function renderFooter() {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { initialLocale: 'vi' },
      createElement(SiteFooter),
    ),
  );
}

describe('SiteFooter', () => {
  it('renders the legacy footer structure and brand links', () => {
    const html = renderFooter();

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

  it('renders co so 1 and co so 2 contact details', () => {
    const html = renderFooter();

    expect(html).toContain('Cơ sở 1');
    expect(html).toContain('292B Nơ Trang Long, P.12, Bình Thạnh, TP.HCM');
    expect(html).toContain('Cơ sở 2');
    expect(html).toContain('742 Xô Viết Nghệ Tĩnh, phường Thạnh Mỹ Tây, Bình Thạnh, TP.HCM');
    expect(html).toContain('037 866 9388');
    expect(html).toContain('href="tel:0378669388"');
  });
});
