'use client';

import { normalizeRankTier, rankIconForTier } from '@/lib/rankIcons';
import { useI18n } from '@/components/i18n/I18nProvider';

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
  const { t, locale } = useI18n();
  const displayLevel = normalizeDisplayLevel(level);
  const displayTier = normalizeRankTier(tier);
  const isMaxLevel = expToNextLevel === null;
  const displayExp = normalizeNonNegativeInteger(expInLevel);
  const displayRequiredExp =
    expToNextLevel === null ? null : normalizeNonNegativeInteger(expToNextLevel);
  const displayProgress = isMaxLevel ? 100 : normalizeProgress(progressPercent);
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const expLabel = isMaxLevel
    ? t('shell.maxLevel')
    : `${displayExp.toLocaleString(numberLocale)} / ${displayRequiredExp?.toLocaleString(numberLocale)} EXP`;
  const levelLabel = t('shell.level', { level: displayLevel });
  const progressAria = isMaxLevel ? t('shell.reachedMaxLevel') : t('shell.expProgress');

  if (variant === 'sidebar') {
    return (
      <span className="badge-rank badge-rank--sidebar">
        <span className="badge-rank-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rankIconForTier(displayTier)} alt="" width={28} height={28} />
          <span className="badge-rank-level">{levelLabel}</span>
        </span>
        <span
          className="badge-rank-exp-track"
          role="progressbar"
          aria-label={progressAria}
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rankIconForTier(displayTier)} alt="" width={28} height={28} />
      <span className="badge-rank-content">
        <span className="badge-rank-level">{levelLabel}</span>
        <span
          className="badge-rank-exp-track"
          role="progressbar"
          aria-label={progressAria}
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
