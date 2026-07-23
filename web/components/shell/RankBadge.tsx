import { normalizeRankTier, rankIconForTier } from '@/lib/rankIcons';

export type RankBadgeProps = {
  level?: number;
  tier?: number;
  expInLevel?: number;
  expToNextLevel?: number | null;
  progressPercent?: number;
  variant?: 'default' | 'sidebar';
};

function normalizeDisplayLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 1;
  return Math.min(Math.floor(level), 50);
}

function normalizeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function RankBadge({
  level = 1,
  tier = 1,
  expInLevel = 0,
  expToNextLevel = 80,
  progressPercent = 0,
  variant = 'default',
}: RankBadgeProps) {
  const displayLevel = normalizeDisplayLevel(level);
  const displayTier = normalizeRankTier(tier);
  const isMaxLevel = expToNextLevel === null;
  const displayExp = normalizeNonNegativeInteger(expInLevel);
  const displayRequiredExp =
    expToNextLevel === null ? null : normalizeNonNegativeInteger(expToNextLevel);
  const displayProgress = isMaxLevel ? 100 : normalizeProgress(progressPercent);
  const expLabel = isMaxLevel
    ? 'Cấp tối đa'
    : `${displayExp.toLocaleString('vi-VN')} / ${displayRequiredExp?.toLocaleString('vi-VN')} EXP`;

  if (variant === 'sidebar') {
    return (
      <span className="badge-rank badge-rank--sidebar">
        <span className="badge-rank-head">
          <img src={rankIconForTier(displayTier)} alt="" width={28} height={28} />
          <span className="badge-rank-level">Cấp {displayLevel}</span>
        </span>
        <span
          className="badge-rank-exp-track"
          role="progressbar"
          aria-label={isMaxLevel ? 'Đã đạt cấp tối đa' : 'Tiến độ kinh nghiệm'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayProgress}
        >
          <span className="badge-rank-exp-fill" style={{ width: `${displayProgress}%` }} />
        </span>
        <span className="badge-rank-exp-text">{expLabel}</span>
      </span>
    );
  }

  return (
    <span className="badge-rank">
      <img src={rankIconForTier(displayTier)} alt="" width={28} height={28} />
      <span className="badge-rank-content">
        <span className="badge-rank-level">Cấp {displayLevel}</span>
        <span
          className="badge-rank-exp-track"
          role="progressbar"
          aria-label={isMaxLevel ? 'Đã đạt cấp tối đa' : 'Tiến độ kinh nghiệm'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayProgress}
        >
          <span className="badge-rank-exp-fill" style={{ width: `${displayProgress}%` }} />
        </span>
        <span className="badge-rank-exp-text">{expLabel}</span>
      </span>
    </span>
  );
}
