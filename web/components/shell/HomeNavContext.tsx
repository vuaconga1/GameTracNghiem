'use client';

import { createContext, useContext } from 'react';

const HomeNavContext = createContext({ homeHref: '/' });

export function HomeNavProvider({
  homeHref,
  children,
}: {
  homeHref: string;
  children: React.ReactNode;
}) {
  return <HomeNavContext.Provider value={{ homeHref }}>{children}</HomeNavContext.Provider>;
}

export function useHomeHref(): string {
  return useContext(HomeNavContext).homeHref;
}
