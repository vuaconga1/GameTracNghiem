'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { usePathname } from 'next/navigation';
import 'driver.js/dist/driver.css';

import { useI18n } from '@/components/i18n/I18nProvider';
import { useHomeHref } from '@/components/shell/HomeNavContext';
import { useSidebar } from '@/components/shell/SidebarContext';

import { startHomeTour, stopHomeTour } from './homeTour';
import { isHomeTourDone } from './storage';

type TourContextValue = {
  startHomeTourGuide: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

function waitForHomeReady(timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const ready =
        Boolean(document.querySelector('[data-tour="courses-area"]')) &&
        Boolean(document.querySelector('[data-tour="tour-replay"]'));
      if (ready) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const homeHref = useHomeHref();
  const { t } = useI18n();
  const { setOpen } = useSidebar();
  const autoStartedRef = useRef(false);

  const startHomeTourGuide = useCallback(() => {
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
    if (narrow) setOpen(true);

    window.setTimeout(() => {
      startHomeTour(t);
    }, narrow ? 280 : 40);
  }, [setOpen, t]);

  useEffect(() => {
    const isHome = pathname === homeHref || pathname === '/';
    if (!isHome) {
      stopHomeTour();
      return;
    }
    if (autoStartedRef.current || isHomeTourDone()) return;

    let cancelled = false;
    void (async () => {
      const ready = await waitForHomeReady();
      if (cancelled || !ready || isHomeTourDone()) return;
      autoStartedRef.current = true;
      startHomeTourGuide();
    })();

    return () => {
      cancelled = true;
    };
  }, [homeHref, pathname, startHomeTourGuide]);

  useEffect(() => {
    return () => stopHomeTour();
  }, []);

  const value = useMemo(() => ({ startHomeTourGuide }), [startHomeTourGuide]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    return {
      startHomeTourGuide: () => undefined,
    };
  }
  return ctx;
}
