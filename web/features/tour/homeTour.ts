import { type DriveStep, type Driver } from 'driver.js';

import { elementExists, filterExistingSteps, startTour, stopActiveTour, type TourTranslate } from './runTour';
import { TOUR_KEYS } from './storage';

export type { TourTranslate };

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

  return filterExistingSteps(candidates);
}

export function startHomeTour(t: TourTranslate): Driver | null {
  return startTour({ steps: buildHomeTourSteps(t), t, doneKey: TOUR_KEYS.home });
}

export function stopHomeTour(): void {
  stopActiveTour();
}
