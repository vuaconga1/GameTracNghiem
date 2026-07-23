import type { ReactNode } from 'react';

type GameResultSummaryProps = {
  title?: string;
  correct: number;
  total: number;
  wrong?: number;
  children?: ReactNode;
};

export function GameResultSummary({
  title = 'Hoàn thành!',
  correct,
  total,
  wrong,
  children,
}: GameResultSummaryProps) {
  const wrongCount = typeof wrong === 'number' ? wrong : Math.max(total - correct, 0);
  return (
    <div className="result-panel game-result-summary">
      <h2>{title}</h2>
      <p className="game-result-summary-text">
        Đúng {correct}/{total} câu
        {wrongCount > 0 ? ` · Sai ${wrongCount}` : ''}
      </p>
      {children ? <div className="game-actions">{children}</div> : null}
    </div>
  );
}
