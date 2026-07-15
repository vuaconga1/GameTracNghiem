import type { ReactNode } from 'react';

type GameScoreHeroProps = {
  gameScore: number;
  label?: string;
};

export function formatGameScore(points: number): string {
  return points.toLocaleString('vi-VN');
}

export function GameScoreHero({
  gameScore,
  label = 'Tổng điểm cao nhất',
}: GameScoreHeroProps) {
  return (
    <div className="game-score-hero" aria-label={`${label}: ${formatGameScore(gameScore)}`}>
      <p className="game-score-hero-value">
        {formatGameScore(gameScore)}
        <span className="game-score-hero-unit">điểm</span>
      </p>
      <p className="game-score-hero-label">{label}</p>
    </div>
  );
}

type GameResultSummaryProps = {
  title?: string;
  gameScore: number;
  correct: number;
  total: number;
  wrong?: number;
  children?: ReactNode;
};

export function GameResultSummary({
  title = 'Hoàn thành!',
  gameScore,
  correct,
  total,
  wrong,
  children,
}: GameResultSummaryProps) {
  const wrongCount = typeof wrong === 'number' ? wrong : Math.max(total - correct, 0);
  return (
    <div className="result-panel game-result-summary">
      <h2>{title}</h2>
      <GameScoreHero gameScore={gameScore} />
      <p className="game-result-summary-text">
        Đúng {correct}/{total} câu
        {wrongCount > 0 ? ` · Sai ${wrongCount}` : ''}
      </p>
      {children ? <div className="game-actions">{children}</div> : null}
    </div>
  );
}
