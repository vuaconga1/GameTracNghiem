'use client';

import type { CSSProperties } from 'react';
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

type AuthMeResponse = {
  loggedIn: boolean;
  username?: string;
};

type RankedPlayer = LeaderboardPlayer & {
  rank: number;
};

type LeaderboardContentProps = {
  period: LeaderboardPeriod;
  offset: number;
  label: string;
  players: LeaderboardPlayer[];
  currentUsername: string;
  isLoading: boolean;
  errorMessage: string;
  updatedAt?: string;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  onOffsetChange: (updater: (offset: number) => number) => void;
};

const PERIOD_TABS: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'all', label: 'Tất cả' },
];

const PODIUM_META: Record<
  number,
  { className: string; iconClassName: string; height: number; background: string }
> = {
  1: {
    className: 'gold',
    iconClassName: 'fas fa-crown',
    height: 120,
    background: 'linear-gradient(to top, #d97706, #fbbf24)',
  },
  2: {
    className: 'silver',
    iconClassName: 'fas fa-award',
    height: 95,
    background: 'linear-gradient(to top, #475569, #94a3b8)',
  },
  3: {
    className: 'bronze',
    iconClassName: 'fas fa-medal',
    height: 75,
    background: 'linear-gradient(to top, #7c2d12, #ea580c)',
  },
};

function formatScore(points: number) {
  return Number(points).toLocaleString('vi-VN');
}

function getPlayerName(player: Pick<LeaderboardPlayer, 'displayName' | 'username'>) {
  return player.displayName || player.username;
}

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function rankPlayers(players: LeaderboardPlayer[]): RankedPlayer[] {
  return players.map((player, index) => ({ ...player, rank: index + 1 }));
}

function PodiumPlayer({ player }: { player: RankedPlayer }) {
  const meta = PODIUM_META[player.rank];
  const name = getPlayerName(player);
  const pedestalStyle: CSSProperties = {
    background: meta.background,
    height: `${meta.height}px`,
  };

  return (
    <div className={`podium-step ${meta.className}`}>
      <div className="podium-user">
        <div className="podium-crown">
          <i className={meta.iconClassName} aria-hidden="true" />
        </div>
        <div className="podium-avatar">{getInitials(name)}</div>
        <div className="podium-name">{name}</div>
        <div className="podium-meta">
          <span className="lb-badge">#{player.rank}</span>
          <span className="podium-score">{formatScore(player.points)}</span>
        </div>
      </div>
      <div className="podium-pedestal" style={pedestalStyle}>
        <span className="pedestal-num">{player.rank}</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ player }: { player: RankedPlayer }) {
  const name = getPlayerName(player);

  return (
    <div className="lb-row">
      <span className="lb-rank-num">{player.rank}</span>
      <div className="lb-avatar">{getInitials(name)}</div>
      <span className="lb-name">{name}</span>
      <span className="lb-badge">#{player.rank}</span>
      <span className="lb-score">
        <i className="fas fa-star text-gold" aria-hidden="true" /> {formatScore(player.points)}
      </span>
    </div>
  );
}

function StickyLeaderboard({ player }: { player: RankedPlayer }) {
  const name = getPlayerName(player);

  return (
    <div className="lb-sticky-wrap">
      <div className="lb-sticky">
        <span className="lb-sticky-rank">Hạng {player.rank}</span>
        <div className="lb-avatar">{getInitials(name)}</div>
        <span className="lb-name">{name}</span>
        <div className="lb-sticky-medals" aria-hidden="true" />
        <span className="lb-score">{formatScore(player.points)}</span>
      </div>
    </div>
  );
}

function LoadingSticky() {
  return (
    <div className="lb-sticky-wrap">
      <div className="lb-sticky is-loading">
        <span className="lb-sticky-loading-text">
          <i className="fas fa-gear fa-spin" aria-hidden="true" /> đang tải dữ liệu
        </span>
        <span className="lb-sticky-rank">Hạng —</span>
        <div className="lb-avatar">—</div>
        <span className="lb-name">—</span>
        <div className="lb-sticky-medals" />
        <span className="lb-score">—</span>
      </div>
    </div>
  );
}

export function LeaderboardContent({
  period,
  offset,
  label,
  players,
  currentUsername,
  isLoading,
  errorMessage,
  updatedAt,
  onPeriodChange,
  onOffsetChange,
}: LeaderboardContentProps) {
  const rankedPlayers = rankPlayers(players);
  const top3 = rankedPlayers.slice(0, 3);
  const podiumPlayers = [top3[1], top3[0], top3[2]].filter(
    (player): player is RankedPlayer => Boolean(player)
  );
  const remainingPlayers = rankedPlayers.slice(3);
  const currentPlayer = currentUsername
    ? rankedPlayers.find((player) => player.username === currentUsername)
    : undefined;
  const periodLabel = label || (period === 'all' ? 'TẤT CẢ' : '—');
  const disablePeriodNav = isLoading || period === 'all';

  return (
    <div className="view-leaderboard">
      <div className="lb-page">
        <div className="lb-top">
          <div className="lb-title-row">
            <h1 className="lb-title">Bảng xếp hạng</h1>
          </div>
          <div className="period-toggle">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`period-btn${period === tab.value ? ' active' : ''}`}
                onClick={() => onPeriodChange(tab.value)}
                disabled={isLoading}
                data-period={tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="period-nav">
          <button
            type="button"
            className="period-nav-btn"
            onClick={() => onOffsetChange((value) => value - 1)}
            disabled={disablePeriodNav}
            aria-label="Kỳ trước"
          >
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
          <span className="period-label">{periodLabel}</span>
          <button
            type="button"
            className="period-nav-btn"
            onClick={() => onOffsetChange((value) => value + 1)}
            disabled={disablePeriodNav || offset >= 0}
            aria-label="Kỳ sau"
          >
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>
        </div>

        <p className="lb-updated">Thời gian cập nhật mới nhất: {updatedAt || '--'}</p>

        {isLoading ? (
          <>
            <div className="lb-podium" />
            <div className="lb-list">
              <DataLoading />
            </div>
          </>
        ) : errorMessage ? (
          <>
            <div className="lb-podium" />
            <div className="lb-list">
              <DataLoading variant="message" message={errorMessage} />
            </div>
          </>
        ) : players.length === 0 ? (
          <>
            <div className="lb-podium" />
            <div className="lb-list">
              <DataLoading variant="message" message="Chưa có dữ liệu" />
            </div>
          </>
        ) : (
          <>
            <div className="lb-podium">
              <div className="podium-container">
                {podiumPlayers.map((player) => (
                  <PodiumPlayer key={player.username} player={player} />
                ))}
              </div>
            </div>
            <div className="lb-list">
              {remainingPlayers.map((player) => (
                <LeaderboardRow key={player.username} player={player} />
              ))}
            </div>
          </>
        )}
      </div>

      {isLoading ? <LoadingSticky /> : currentPlayer ? <StickyLeaderboard player={currentPlayer} /> : null}
    </div>
  );
}

export function LeaderboardPanel() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [offset, setOffset] = useState(0);
  const [label, setLabel] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [currentUsername, setCurrentUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentUser() {
      try {
        const res = await fetch('/api/auth/me', { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as AuthMeResponse;
        if (data.loggedIn && data.username) {
          setCurrentUsername(data.username);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    loadCurrentUser();

    return () => controller.abort();
  }, []);

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
        setUpdatedAt(new Date().toLocaleString('vi-VN'));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setPlayers([]);
        setLabel('');
        setUpdatedAt('');
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
    <LeaderboardContent
      period={period}
      offset={offset}
      label={label}
      players={players}
      currentUsername={currentUsername}
      isLoading={isLoading}
      errorMessage={errorMessage}
      updatedAt={updatedAt}
      onPeriodChange={handlePeriodChange}
      onOffsetChange={setOffset}
    />
  );
}
