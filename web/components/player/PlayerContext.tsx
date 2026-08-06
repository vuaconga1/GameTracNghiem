'use client';

import { createContext, useContext, type ReactNode } from 'react';

import {
  AUTHENTICATED_PLAYER,
  GUEST_PLAYER,
  type PlayerDescriptor,
  type PlayerKind,
} from '@/lib/player/types';

const PlayerContext = createContext<PlayerDescriptor>(GUEST_PLAYER);

export function PlayerProvider({
  kind,
  children,
}: {
  kind: PlayerKind;
  children: ReactNode;
}) {
  return (
    <PlayerContext.Provider value={kind === 'authenticated' ? AUTHENTICATED_PLAYER : GUEST_PLAYER}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerDescriptor {
  return useContext(PlayerContext);
}
