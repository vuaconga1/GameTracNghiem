'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';

import { AvatarEditorModal } from './AvatarEditorModal';
import { useHomeHref } from './HomeNavContext';
import { RankBadge } from './RankBadge';

type SidebarProps = {
  mode: 'home' | 'game';
  displayName: string;
  avatarUrl?: string | null;
  isGuest?: boolean;
  level?: number;
  tier?: number;
  expInLevel?: number;
  expToNextLevel?: number | null;
  progressPercent?: number;
  filtersSlot?: React.ReactNode;
  gameNav?: React.ReactNode;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Sidebar({
  mode,
  displayName,
  avatarUrl = null,
  isGuest = false,
  level,
  tier,
  expInLevel,
  expToNextLevel,
  progressPercent,
  filtersSlot,
  gameNav,
}: SidebarProps) {
  const { t } = useI18n();
  const homeHref = useHomeHref();
  const [editorOpen, setEditorOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);

  useEffect(() => {
    setAvatar(avatarUrl);
  }, [avatarUrl]);

  const avatarContent = avatar ? (
    <img src={avatar} alt="" className="sidebar-user-avatar-img" />
  ) : (
    initialsFromName(displayName)
  );

  return (
    <aside className="sidebar">
      <Link href={homeHref} className="sidebar-logo" aria-label={t('common.home')}>
        <img src="/wewinlogo.png" alt="WeWIN Logo" />
      </Link>

      <div className="sidebar-user" data-tour="sidebar-user">
        {isGuest ? (
          <div className="sidebar-user-avatar" aria-hidden="true">
            {avatarContent}
          </div>
        ) : (
          <button
            type="button"
            className="sidebar-user-avatar sidebar-user-avatar-btn"
            onClick={() => setEditorOpen(true)}
            aria-label={t('avatar.editAria')}
            title={t('avatar.editAria')}
          >
            {avatarContent}
            <span className="sidebar-user-avatar-edit" aria-hidden="true">
              <i className="fas fa-camera" />
            </span>
          </button>
        )}
        <div className="sidebar-user-meta">
          <div className="sidebar-user-name">{displayName}</div>
          {isGuest ? (
            <div className="sidebar-user-role">{t('shell.guestProgress')}</div>
          ) : (
            <RankBadge
              variant="sidebar"
              level={level}
              tier={tier}
              expInLevel={expInLevel}
              expToNextLevel={expToNextLevel}
              progressPercent={progressPercent}
            />
          )}
        </div>
      </div>

      {mode === 'game' ? (
        <nav className="sidebar-nav">{gameNav}</nav>
      ) : (
        <div className="sidebar-filters filters">{filtersSlot}</div>
      )}

      <div className="sidebar-version">{t('common.version', { version: '2.3.219' })}</div>

      {isGuest ? null : (
        <AvatarEditorModal
          open={editorOpen}
          currentAvatarUrl={avatar}
          displayName={displayName}
          onClose={() => setEditorOpen(false)}
          onSaved={(next) => {
            setAvatar(next);
            setEditorOpen(false);
          }}
        />
      )}
    </aside>
  );
}
