import { driver, type DriveStep, type Driver } from 'driver.js';

import { markHomeTourDone } from './storage';

export type TourTranslate = (key: string, params?: Record<string, string | number>) => string;

let activeTour: Driver | null = null;

function elementExists(selector: string): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector(selector));
}

export function buildHomeTourSteps(t: TourTranslate): DriveStep[] {
  const candidates: DriveStep[] = [
    {
      element: '[data-tour="sidebar-user"]',
      popover: {
        title: t('tour.home.userTitle'),
        description: t('tour.home.userBody'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="level-filters"]',
      popover: {
        title: t('tour.home.filtersTitle'),
        description: t('tour.home.filtersBody'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="courses-area"]',
      popover: {
        title: t('tour.home.coursesTitle'),
        description: t('tour.home.coursesBody'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="course-grid"]',
      popover: {
        title: t('tour.home.courseCardTitle'),
        description: t('tour.home.courseCardBody'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="language"]',
      popover: {
        title: t('tour.home.languageTitle'),
        description: t('tour.home.languageBody'),
        side: 'bottom',
        align: 'end',
      },
    },
  ];

  if (elementExists('[data-tour="auth-login"]')) {
    candidates.push({
      element: '[data-tour="auth-login"]',
      popover: {
        title: t('tour.home.loginTitle'),
        description: t('tour.home.loginBody'),
        side: 'bottom',
        align: 'end',
      },
    });
  } else if (elementExists('[data-tour="auth-logout"]')) {
    candidates.push({
      element: '[data-tour="auth-logout"]',
      popover: {
        title: t('tour.home.accountTitle'),
        description: t('tour.home.accountBody'),
        side: 'bottom',
        align: 'end',
      },
    });
  }

  candidates.push({
    element: '[data-tour="tour-replay"]',
    popover: {
      title: t('tour.home.replayTitle'),
      description: t('tour.home.replayBody'),
      side: 'bottom',
      align: 'end',
    },
  });

  return candidates.filter((step) => {
    if (!step.element || typeof step.element !== 'string') return true;
    return elementExists(step.element);
  });
}

export function startHomeTour(t: TourTranslate): Driver | null {
  if (typeof window === 'undefined') return null;

  stopHomeTour();

  const steps = buildHomeTourSteps(t);
  if (steps.length === 0) return null;

  const instance = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 12,
    allowClose: true,
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done'),
    progressText: '{{current}} / {{total}}',
    steps,
    onDestroyed: () => {
      markHomeTourDone();
      if (activeTour === instance) activeTour = null;
    },
  });

  activeTour = instance;
  instance.drive();
  return instance;
}

export function stopHomeTour(): void {
  if (!activeTour) return;
  const current = activeTour;
  activeTour = null;
  current.destroy();
}
