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
import './tour.css';

import { useI18n } from '@/components/i18n/I18nProvider';
import { useHomeHref } from '@/components/shell/HomeNavContext';
import { useSidebar } from '@/components/shell/SidebarContext';

import { startTour, stopActiveTour } from './runTour';
import { isTourDone } from './storage';
import { resolveTour, type TourDefinition } from './tours';

type TourContextValue = {
  /** Start the tour that applies to the current page (used by the header replay button). */
  startTourGuide: () => void;
  /** Backwards-compatible alias kept for existing callers. */
  startHomeTourGuide: () => void;
  /** Whether the current page has a tour available. */
  hasTour: boolean;
};

const TourContext = createContext<TourContextValue | null>(null);

function waitForSelector(selector: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }
    const started = Date.now();
    const tick = () => {
      if (document.querySelector(selector)) {
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
  const autoStartedRef = useRef<Set<string>>(new Set());

  const isHome = pathname === homeHref || pathname === '/';
  const currentTour = useMemo<TourDefinition | null>(
    () => resolveTour(pathname, { isHome }),
    [pathname, isHome],
  );

  const runTourGuide = useCallback(
    (tour: TourDefinition) => {
      const narrow =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 900px)').matches;
      if (narrow && tour.openSidebarOnNarrow) setOpen(true);

      window.setTimeout(
        () => {
          startTour({ steps: tour.buildSteps(t), t, doneKey: tour.doneKey });
        },
        narrow && tour.openSidebarOnNarrow ? 280 : 40,
      );
    },
    [setOpen, t],
  );

  const startTourGuide = useCallback(() => {
    if (!currentTour) return;
    runTourGuide(currentTour);
  }, [currentTour, runTourGuide]);

  useEffect(() => {
    if (!currentTour) {
      stopActiveTour();
      return;
    }

    const tour = currentTour;
    if (autoStartedRef.current.has(tour.id) || isTourDone(tour.doneKey)) return;

    let cancelled = false;
    void (async () => {
      const ready = await waitForSelector(tour.readySelector);
      if (cancelled || !ready || isTourDone(tour.doneKey)) return;
      autoStartedRef.current.add(tour.id);
      runTourGuide(tour);
    })();

    return () => {
      cancelled = true;
      stopActiveTour();
    };
  }, [currentTour, runTourGuide]);

  useEffect(() => {
    return () => stopActiveTour();
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      startTourGuide,
      startHomeTourGuide: startTourGuide,
      hasTour: Boolean(currentTour),
    }),
    [startTourGuide, currentTour],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    return {
      startTourGuide: () => undefined,
      startHomeTourGuide: () => undefined,
      hasTour: false,
    };
  }
  return ctx;
}
