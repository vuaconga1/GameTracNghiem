import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/components/i18n/I18nProvider';
import { GameListActions } from './GameListActions';

describe('GameListActions', () => {
  it('shows continue and restart when progress is partial', () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        { initialLocale: 'vi' },
        createElement(GameListActions, {
          stats: { correct: 2, wrong: 3, pending: 5 },
          allAnswered: false,
          onContinue: vi.fn(),
          onRestartFromStart: vi.fn(),
        }),
      ),
    );

    expect(html).toContain('Làm tiếp');
    expect(html).toContain('Làm lại từ đầu');
    expect(html).not.toContain('Bắt đầu làm bài');
  });

  it('shows start exercise when nothing is graded yet', () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        { initialLocale: 'vi' },
        createElement(GameListActions, {
          stats: { correct: 0, wrong: 0, pending: 5 },
          allAnswered: false,
          onContinue: vi.fn(),
          onRestartFromStart: vi.fn(),
        }),
      ),
    );

    expect(html).toContain('Bắt đầu làm bài');
    expect(html).not.toContain('Làm tiếp');
  });
});
