import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RankBadge } from './RankBadge';

function renderRankBadge(props: { level?: number; tier?: number } = {}) {
  return renderToStaticMarkup(createElement(RankBadge, props));
}

describe('RankBadge', () => {
  it('renders the level-one shield by default', () => {
    const html = renderRankBadge();

    expect(html).toContain('src="/icons/rank/tier-01.svg"');
    expect(html).toContain('<span>1</span>');
  });

  it('renders the supplied level and tier shield', () => {
    const html = renderRankBadge({ level: 12, tier: 3 });

    expect(html).toContain('src="/icons/rank/tier-03.svg"');
    expect(html).toContain('<span>12</span>');
  });

  it('normalizes invalid and zero values', () => {
    const html = renderRankBadge({ level: 0, tier: Number.NaN });

    expect(html).toContain('src="/icons/rank/tier-01.svg"');
    expect(html).toContain('<span>1</span>');
  });

  it('floors and caps the displayed level at 50', () => {
    expect(renderRankBadge({ level: 12.9, tier: 1 })).toContain('<span>12</span>');
    expect(renderRankBadge({ level: 99, tier: 1 })).toContain('<span>50</span>');
  });
});
