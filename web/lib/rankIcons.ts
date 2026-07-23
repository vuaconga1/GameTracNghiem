export const RANK_TIER_COUNT = 10;

export type RankTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const RANK_TIER_ICONS: Readonly<Record<RankTier, string>> = {
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

function toFiniteNumber(value: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeRankTier(tier: number): RankTier {
  const finite = toFiniteNumber(tier);
  if (finite === null || finite < 1) return 1;
  const floored = Math.floor(finite);
  if (floored > RANK_TIER_COUNT) return RANK_TIER_COUNT;
  return floored as RankTier;
}

export function rankTierForLevel(level: number): RankTier {
  const finite = toFiniteNumber(level);
  if (finite === null || finite < 1) return 1;
  const floored = Math.floor(finite);
  return normalizeRankTier(Math.floor((floored - 1) / 5) + 1);
}

export function rankIconForTier(tier: number): string {
  return RANK_TIER_ICONS[normalizeRankTier(tier)];
}

export function rankIconForLevel(level: number): string {
  return RANK_TIER_ICONS[rankTierForLevel(level)];
}
