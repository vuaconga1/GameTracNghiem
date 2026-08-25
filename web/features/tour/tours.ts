import { type DriveStep } from 'driver.js';

import { findGameByPathname } from '@/lib/gameCatalog';

import { buildHomeTourSteps } from './homeTour';
import { filterExistingSteps, type TourTranslate } from './runTour';
import { gameTourDoneKey, TOUR_KEYS } from './storage';

export type TourDefinition = {
  id: string;
  doneKey: string;
  /** Selector that signals the page content is painted and ready to highlight. */
  readySelector: string;
  buildSteps: (t: TourTranslate) => DriveStep[];
  /** Open the mobile sidebar first (tour highlights something inside it). */
  openSidebarOnNarrow?: boolean;
};

function buildCourseTourSteps(t: TourTranslate): DriveStep[] {
  return filterExistingSteps([
    {
      element: '[data-tour="course-info"]',
      popover: {
        title: t('tour.course.infoTitle'),
        description: t('tour.course.infoBody'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="course-skills"]',
      popover: {
        title: t('tour.course.skillsTitle'),
        description: t('tour.course.skillsBody'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '.page-back-bar',
      popover: {
        title: t('tour.course.backTitle'),
        description: t('tour.course.backBody'),
        side: 'bottom',
        align: 'start',
      },
    },
  ]);
}

function buildLeaderboardTourSteps(t: TourTranslate): DriveStep[] {
  return filterExistingSteps([
    {
      element: '.period-toggle',
      popover: {
        title: t('tour.leaderboard.periodTitle'),
        description: t('tour.leaderboard.periodBody'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '.lb-podium',
      popover: {
        title: t('tour.leaderboard.podiumTitle'),
        description: t('tour.leaderboard.podiumBody'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '.lb-list',
      popover: {
        title: t('tour.leaderboard.listTitle'),
        description: t('tour.leaderboard.listBody'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '.lb-sticky-wrap',
      popover: {
        title: t('tour.leaderboard.selfTitle'),
        description: t('tour.leaderboard.selfBody'),
        side: 'top',
        align: 'center',
      },
    },
  ]);
}

function buildSpeakingHubTourSteps(t: TourTranslate): DriveStep[] {
  return filterExistingSteps([
    {
      element: '[data-tour="speaking-hub-info"]',
      popover: {
        title: t('tour.speakingHub.infoTitle'),
        description: t('tour.speakingHub.infoBody'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-skill-step="speaking-hub"]',
      popover: {
        title: t('tour.speakingHub.activitiesTitle'),
        description: t('tour.speakingHub.activitiesBody'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '.page-back-bar',
      popover: {
        title: t('tour.speakingHub.backTitle'),
        description: t('tour.speakingHub.backBody'),
        side: 'bottom',
        align: 'start',
      },
    },
  ]);
}

function buildLogisticsTourSteps(t: TourTranslate): DriveStep[] {
  return filterExistingSteps([
    {
      element: '[data-tour="logistics-courses"]',
      popover: {
        title: t('tour.logistics.coursesTitle'),
        description: t('tour.logistics.coursesBody'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '.sidebar-nav',
      popover: {
        title: t('tour.logistics.weeksTitle'),
        description: t('tour.logistics.weeksBody'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tour-replay"]',
      popover: {
        title: t('tour.logistics.replayTitle'),
        description: t('tour.logistics.replayBody'),
        side: 'bottom',
        align: 'end',
      },
    },
  ]);
}

function buildGameTourSteps(gameKey: string, t: TourTranslate): DriveStep[] {
  return filterExistingSteps([
    {
      // Prefer compact title targets — full-width `.pron-hero` + align:start pushed popovers into the sidebar.
      element: '[data-tour="game-intro"], .game-title-wrap, .pron-hero-title',
      popover: {
        title: t(`games.${gameKey}`),
        description: t(`tour.games.${gameKey}`),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="game-progress"], .list-stats',
      popover: {
        title: t('tour.gameCommon.progressTitle'),
        description: t('tour.gameCommon.progressBody'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="game-score"], .game-meta',
      popover: {
        title: t('tour.gameCommon.scoreTitle'),
        description: t('tour.gameCommon.scoreBody'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="game-start"]',
      popover: {
        title: t('tour.gameCommon.startTitle'),
        description: t('tour.gameCommon.startBody'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="game-back"], .page-back-bar',
      popover: {
        title: t('tour.gameCommon.backTitle'),
        description: t('tour.gameCommon.backBody'),
        side: 'bottom',
        align: 'center',
      },
    },
  ]);
}

/**
 * Resolve the tour that applies to the current route.
 * `isHome` is passed in because the home route can be a configurable href.
 */
export function resolveTour(
  pathname: string,
  opts: { isHome: boolean },
): TourDefinition | null {
  if (opts.isHome) {
    return {
      id: 'home',
      doneKey: TOUR_KEYS.home,
      readySelector: '[data-tour="courses-area"]',
      buildSteps: buildHomeTourSteps,
      openSidebarOnNarrow: true,
    };
  }

  const game = findGameByPathname(pathname);
  if (game) {
    return {
      id: `game.${game.key}`,
      doneKey: gameTourDoneKey(game.key),
      readySelector: '[data-tour="game-intro"], .game-title-wrap, .pron-hero-title',
      buildSteps: (t) => buildGameTourSteps(game.key, t),
    };
  }

  if (/^\/courses\/[^/]+/.test(pathname)) {
    return {
      id: 'course',
      doneKey: TOUR_KEYS.course,
      readySelector: '[data-tour="course-info"], [data-tour="course-skills"]',
      buildSteps: buildCourseTourSteps,
    };
  }

  // Speaking hub only (activity drill pages have their own dedicated mic UI).
  if (/^\/speaking\/[^/]+\/?$/.test(pathname)) {
    return {
      id: 'speakingHub',
      doneKey: TOUR_KEYS.speakingHub,
      readySelector: '[data-skill-step="speaking-hub"]',
      buildSteps: buildSpeakingHubTourSteps,
    };
  }

  if (pathname === '/leaderboard' || pathname.startsWith('/leaderboard/')) {
    return {
      id: 'leaderboard',
      doneKey: TOUR_KEYS.leaderboard,
      readySelector: '.podium-step',
      buildSteps: buildLeaderboardTourSteps,
    };
  }

  if (pathname === '/logistics' || pathname.startsWith('/logistics/')) {
    return {
      id: 'logistics',
      doneKey: TOUR_KEYS.logistics,
      readySelector: '[data-tour="logistics-courses"]',
      buildSteps: buildLogisticsTourSteps,
      openSidebarOnNarrow: true,
    };
  }

  return null;
}
