import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RankBadge } from './RankBadge';

function renderRankBadge(
  props: {
    level?: number;
    tier?: number;
    expInLevel?: number;
    expToNextLevel?: number | null;
    progressPercent?: number;
    variant?: 'default' | 'sidebar';
  } = {}
) {
  return renderToStaticMarkup(createElement(RankBadge, props));
}

describe('RankBadge', () => {
  it('renders the level-one shield by default', () => {
    const html = renderRankBadge();

    expect(html).toContain('src="/icons/rank/tier-01.svg"');
    expect(html).toContain('Cấp 1');
    expect(html).toContain('0 / 80 EXP');
  });

  it('renders the supplied rank and EXP progress', () => {
    const html = renderRankBadge({
      level: 12,
      tier: 3,
      expInLevel: 50,
      expToNextLevel: 200,
      progressPercent: 25,
    });

    expect(html).toContain('src="/icons/rank/tier-03.svg"');
    expect(html).toContain('Cấp 12');
    expect(html).toContain('50 / 200 EXP');
    expect(html).toContain('width:25%');
  });

  it('normalizes invalid and zero values', () => {
    const html = renderRankBadge({ level: 0, tier: Number.NaN });

    expect(html).toContain('src="/icons/rank/tier-01.svg"');
    expect(html).toContain('Cấp 1');
  });

  it('floors and caps the displayed level at 50', () => {
    expect(renderRankBadge({ level: 12.9, tier: 1 })).toContain('Cấp 12');
    expect(renderRankBadge({ level: 99, tier: 1 })).toContain('Cấp 50');
  });

  it('renders a full bar and max-level label when there is no next level', () => {
    const html = renderRankBadge({
      level: 50,
      tier: 10,
      expInLevel: 1_234,
      expToNextLevel: null,
      progressPercent: 100,
    });

    expect(html).toContain('Cấp tối đa');
    expect(html).toContain('width:100%');
  });

  it('renders the sidebar stacked layout with a head row and full-width track', () => {
    const html = renderRankBadge({
      level: 2,
      tier: 1,
      expInLevel: 1,
      expToNextLevel: 204,
      progressPercent: 1,
      variant: 'sidebar',
    });

    expect(html).toContain('class="badge-rank badge-rank--sidebar"');
    expect(html).toContain('class="badge-rank-head"');
    expect(html).toContain('Cấp 2');
    expect(html).toContain('1 / 204 EXP');
  });
});
