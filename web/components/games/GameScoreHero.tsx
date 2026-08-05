'use client';

import type { ReactNode } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';

type GameResultSummaryProps = {
  title?: string;
  correct: number;
  total: number;
  wrong?: number;
  children?: ReactNode;
};

export function GameResultSummary({
  title,
  correct,
  total,
  wrong,
  children,
}: GameResultSummaryProps) {
  const { t } = useI18n();
  const wrongCount = typeof wrong === 'number' ? wrong : Math.max(total - correct, 0);
  return (
    <div className="result-panel game-result-summary">
      <h2>{title ?? t('gameUi.completed')}</h2>
      <p className="game-result-summary-text">
        {t('gameUi.resultCorrect', { correct, total })}
        {wrongCount > 0 ? t('gameUi.resultWrongSuffix', { count: wrongCount }) : ''}
      </p>
      {children ? <div className="game-actions">{children}</div> : null}
    </div>
  );
}
