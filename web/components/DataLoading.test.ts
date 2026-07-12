import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DataLoading } from './DataLoading';

describe('DataLoading', () => {
  it('renders the workspace loading state with gear spinner', () => {
    const html = renderToStaticMarkup(DataLoading({}));

    expect(html).toContain('class="data-loading-state"');
    expect(html).toContain('class="fas fa-gear fa-spin"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('đang tải dữ liệu');
  });

  it('renders message states without the gear spinner', () => {
    const html = renderToStaticMarkup(
      DataLoading({ variant: 'message', message: 'Không có dữ liệu' })
    );

    expect(html).toContain('class="data-loading-state"');
    expect(html).toContain('Không có dữ liệu');
    expect(html).not.toContain('fa-gear');
  });
});
