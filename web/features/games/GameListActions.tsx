'use client';

import { useI18n } from '@/components/i18n/I18nProvider';

export type GameListStats = {
  correct: number;
  wrong: number;
  pending: number;
};

type GameListActionsProps = {
  stats: GameListStats;
  allAnswered: boolean;
  isResetting?: boolean;
  onContinue: () => void;
  onRestartFromStart: () => void;
  onViewResult?: () => void;
};

export function GameListActions({
  stats,
  allAnswered,
  isResetting = false,
  onContinue,
  onRestartFromStart,
  onViewResult,
}: GameListActionsProps) {
  const { t } = useI18n();
  const hasStarted = stats.correct + stats.wrong > 0;
  const hasPartialProgress = hasStarted && stats.pending > 0;

  if (hasPartialProgress) {
    return (
      <div className="game-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onContinue}
          disabled={isResetting}
        >
          {t('common.continueExercise')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRestartFromStart}
          disabled={isResetting}
        >
          {isResetting ? t('common.redoing') : t('common.restartFromStart')}
        </button>
      </div>
    );
  }

  return (
    <div className="game-actions">
      <button
        type="button"
        className="btn btn-primary"
        onClick={allAnswered ? onRestartFromStart : onContinue}
        disabled={isResetting}
      >
        {isResetting
          ? t('common.redoing')
          : allAnswered
            ? t('common.restartFromStart')
            : t('common.startExercise')}
      </button>
      {allAnswered && onViewResult ? (
        <button type="button" className="btn btn-secondary" onClick={onViewResult}>
          {t('gameUi.seeResults')}
        </button>
      ) : null}
    </div>
  );
}
