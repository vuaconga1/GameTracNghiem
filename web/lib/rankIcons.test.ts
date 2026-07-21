import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RANK_TIER_COUNT,
  RANK_TIER_ICONS,
  normalizeRankTier,
  rankIconForLevel,
  rankIconForTier,
  rankTierForLevel,
  type RankTier,
} from './rankIcons';

const EXPECTED_PATHS: Record<RankTier, string> = {
  1: '/icons/rank/tier-01.svg',
  2: '/icons/rank/tier-02.svg',
  3: '/icons/rank/tier-03.svg',
  4: '/icons/rank/tier-04.svg',
  5: '/icons/rank/tier-05.svg',
  6: '/icons/rank/tier-06.svg',
  7: '/icons/rank/tier-07.svg',
  8: '/icons/rank/tier-08.svg',
  9: '/icons/rank/tier-09.svg',
  10: '/icons/rank/tier-10.svg',
};

const FORBIDDEN_SVG_PATTERNS = [
  /<script/i,
  /<filter/i,
  /<linearGradient/i,
  /<radialGradient/i,
  /\shref=/i,
  /<image/i,
];

describe('RANK_TIER_ICONS', () => {
  it('exposes exactly ten tiers with stable public paths', () => {
    expect(RANK_TIER_COUNT).toBe(10);
    expect(Object.keys(RANK_TIER_ICONS)).toHaveLength(10);
    for (const tier of Object.keys(EXPECTED_PATHS).map(Number) as RankTier[]) {
      expect(RANK_TIER_ICONS[tier]).toBe(EXPECTED_PATHS[tier]);
    }
  });
});

describe('normalizeRankTier', () => {
  it('maps non-finite, zero, and negative values to 1', () => {
    expect(normalizeRankTier(Number.NaN)).toBe(1);
    expect(normalizeRankTier(Number.POSITIVE_INFINITY)).toBe(1);
    expect(normalizeRankTier(Number.NEGATIVE_INFINITY)).toBe(1);
    expect(normalizeRankTier(0)).toBe(1);
    expect(normalizeRankTier(-3)).toBe(1);
  });

  it('floors decimals and clamps above 10 to 10', () => {
    expect(normalizeRankTier(2.9)).toBe(2);
    expect(normalizeRankTier(10.8)).toBe(10);
    expect(normalizeRankTier(11)).toBe(10);
    expect(normalizeRankTier(99)).toBe(10);
  });
});

describe('rankTierForLevel', () => {
  it('maps level bands of five to tiers 1–10', () => {
    expect(rankTierForLevel(1)).toBe(1);
    expect(rankTierForLevel(5)).toBe(1);
    expect(rankTierForLevel(6)).toBe(2);
    expect(rankTierForLevel(10)).toBe(2);
    expect(rankTierForLevel(46)).toBe(10);
    expect(rankTierForLevel(50)).toBe(10);
  });

  it('clamps overflow and invalid levels to supported tiers', () => {
    expect(rankTierForLevel(51)).toBe(10);
    expect(rankTierForLevel(100)).toBe(10);
    expect(rankTierForLevel(0)).toBe(1);
    expect(rankTierForLevel(-2)).toBe(1);
    expect(rankTierForLevel(Number.NaN)).toBe(1);
    expect(rankTierForLevel(7.9)).toBe(2);
  });
});

describe('rankIconForTier and rankIconForLevel', () => {
  it('returns the mapped path for a tier', () => {
    expect(rankIconForTier(1)).toBe('/icons/rank/tier-01.svg');
    expect(rankIconForTier(10)).toBe('/icons/rank/tier-10.svg');
    expect(rankIconForTier(3.7)).toBe('/icons/rank/tier-03.svg');
    expect(rankIconForTier(0)).toBe('/icons/rank/tier-01.svg');
    expect(rankIconForTier(99)).toBe('/icons/rank/tier-10.svg');
  });

  it('returns the mapped path for a level', () => {
    expect(rankIconForLevel(1)).toBe('/icons/rank/tier-01.svg');
    expect(rankIconForLevel(5)).toBe('/icons/rank/tier-01.svg');
    expect(rankIconForLevel(6)).toBe('/icons/rank/tier-02.svg');
    expect(rankIconForLevel(46)).toBe('/icons/rank/tier-10.svg');
    expect(rankIconForLevel(51)).toBe('/icons/rank/tier-10.svg');
  });
});

describe('rank SVG assets', () => {
  it('exists under public with required flat SVG markup', () => {
    const publicRoot = path.join(process.cwd(), 'public');

    for (const tier of Object.keys(EXPECTED_PATHS).map(Number) as RankTier[]) {
      const publicPath = EXPECTED_PATHS[tier];
      const filePath = path.join(publicRoot, publicPath.replace(/^\//, ''));
      expect(existsSync(filePath), `missing ${publicPath}`).toBe(true);

      const svg = readFileSync(filePath, 'utf8');
      expect(svg.trimStart().startsWith('<svg')).toBe(true);
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toMatch(/<title>[^<]+<\/title>/);
      for (const pattern of FORBIDDEN_SVG_PATTERNS) {
        expect(svg, `${publicPath} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
