import { normalizeRankTier, rankIconForTier } from '@/lib/rankIcons';

export type RankBadgeProps = {
  level?: number;
  tier?: number;
};

function normalizeDisplayLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 1;
  return Math.min(Math.floor(level), 50);
}

export function RankBadge({ level = 1, tier = 1 }: RankBadgeProps) {
  const displayLevel = normalizeDisplayLevel(level);
  const displayTier = normalizeRankTier(tier);

  return (
    <span className="badge-rank">
      <img src={rankIconForTier(displayTier)} alt="" width={14} height={14} />
      <span>{displayLevel}</span>
    </span>
  );
}
