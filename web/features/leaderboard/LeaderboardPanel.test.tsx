import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LeaderboardContent } from './LeaderboardPanel';

describe('LeaderboardContent', () => {
  it('renders the legacy podium, list, and sticky leaderboard structure', () => {
    const html = renderToStaticMarkup(
      createElement(LeaderboardContent, {
        period: 'week',
        offset: 0,
        label: 'TUAN NAY',
        players: [
          { username: 'first', displayName: 'Bạn Hạng Nhất', points: 1200 },
          { username: 'second', displayName: 'Bạn Hạng Nhì', points: 980 },
          { username: 'third', displayName: 'Bạn Hạng Ba', points: 760 },
          { username: 'demo', displayName: 'Học sinh Demo', points: 540 },
        ],
        currentUsername: 'demo',
        isLoading: false,
        errorMessage: '',
        onPeriodChange: () => undefined,
        onOffsetChange: () => undefined,
      })
    );

    expect(html).toContain('class="view-leaderboard"');
    expect(html).toContain('class="lb-page"');
    expect(html).toContain('class="period-toggle"');
    expect(html).toContain('class="period-btn active"');
    expect(html).toContain('class="lb-podium"');
    expect(html).toContain('class="podium-container"');
    expect(html).toContain('class="podium-step silver"');
    expect(html).toContain('class="podium-step gold"');
    expect(html).toContain('class="podium-step bronze"');
    expect(html.indexOf('Bạn Hạng Nhì')).toBeLessThan(html.indexOf('Bạn Hạng Nhất'));
    expect(html.indexOf('Bạn Hạng Nhất')).toBeLessThan(html.indexOf('Bạn Hạng Ba'));
    expect(html).toContain('class="lb-list"');
    expect(html).toContain('class="lb-row"');
    expect(html).toContain('Học sinh Demo');
    expect(html).toContain('class="lb-sticky-wrap"');
    expect(html).toContain('class="lb-sticky"');
    expect(html).toContain('Hạng 4');
  });
});
