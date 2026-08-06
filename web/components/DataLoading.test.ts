import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from './i18n/I18nProvider';
import { DataLoading } from './DataLoading';

function renderDataLoading(props: Parameters<typeof DataLoading>[0]) {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { initialLocale: 'vi' },
      createElement(DataLoading, props),
    ),
  );
}

describe('DataLoading', () => {
  it('renders the workspace loading state with gear spinner', () => {
    const html = renderDataLoading({});

    expect(html).toContain('class="data-loading-state"');
    expect(html).toContain('class="fas fa-gear fa-spin"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('đang tải dữ liệu');
  });

  it('renders message states without the gear spinner', () => {
    const html = renderDataLoading({ variant: 'message', message: 'Không có dữ liệu' });

    expect(html).toContain('class="data-loading-state"');
    expect(html).toContain('Không có dữ liệu');
    expect(html).not.toContain('fa-gear');
  });
});
