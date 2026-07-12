'use client';

import { useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import type { LeaderboardPeriod, LeaderboardPlayer } from '@/lib/leaderboard';

type LeaderboardResponse = {
  success: boolean;
  players?: LeaderboardPlayer[];
  period?: LeaderboardPeriod;
  label?: string;
  message?: string;
};

const PERIOD_TABS: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'all', label: 'Tất cả' },
];

export function LeaderboardPanel() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [offset, setOffset] = useState(0);
  const [label, setLabel] = useState('');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      period,
      offset: String(offset),
    });

    async function loadLeaderboard() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/leaderboard?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as LeaderboardResponse;

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Không tải được bảng xếp hạng');
        }

        setPlayers(data.players || []);
        setLabel(data.label || '');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setPlayers([]);
        setLabel('');
        setErrorMessage(err instanceof Error ? err.message : 'Không tải được bảng xếp hạng');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => controller.abort();
  }, [period, offset]);

  function handlePeriodChange(nextPeriod: LeaderboardPeriod) {
    setPeriod(nextPeriod);
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[0_14px_40px_rgba(13,43,110,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handlePeriodChange(tab.value)}
              disabled={isLoading}
              className={`rounded-full px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                period === tab.value
                  ? 'bg-[var(--primary)] text-[var(--white)]'
                  : 'bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary-hover)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {period !== 'all' ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setOffset((value) => value - 1)}
              disabled={isLoading}
              aria-label="Kỳ trước"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--primary)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
            </button>
            <span className="min-w-32 text-center text-sm font-black uppercase tracking-[0.12em] text-[var(--primary)]">
              {label || '—'}
            </span>
            <button
              type="button"
              onClick={() => setOffset((value) => value + 1)}
              disabled={isLoading || offset >= 0}
              aria-label="Kỳ sau"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--primary)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <span className="text-center text-sm font-black uppercase tracking-[0.12em] text-[var(--primary)]">
            {label || 'TẤT CẢ'}
          </span>
        )}
      </div>

      {isLoading ? (
        <DataLoading />
      ) : errorMessage ? (
        <DataLoading variant="message" message={errorMessage} />
      ) : players.length === 0 ? (
        <DataLoading variant="message" message="Chưa có điểm trong kỳ này" />
      ) : (
        <ol className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--white)] shadow-[0_14px_40px_rgba(13,43,110,0.06)]">
          {players.map((player, index) => (
            <li
              key={player.username}
              className="flex items-center gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-lg font-black text-[var(--primary)]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black text-[var(--primary)]">
                  {player.displayName || player.username}
                </p>
                <p className="truncate text-sm font-bold text-[var(--text-muted)]">
                  @{player.username}
                </p>
              </div>
              <p className="text-xl font-black text-[var(--accent-gold)]">{player.points}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
