import { driver, type DriveStep, type Driver, type PopoverDOM } from 'driver.js';

import { markTourDone } from './storage';

export type TourTranslate = (key: string, params?: Record<string, string | number>) => string;

let activeTour: Driver | null = null;

/** True when at least one element matches the selector in the live DOM. */
export function elementExists(selector: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return Boolean(document.querySelector(selector));
  } catch {
    return false;
  }
}

/** Keep only steps whose target element is present (element-less steps always pass). */
export function filterExistingSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((step) => {
    if (!step.element || typeof step.element !== 'string') return true;
    return elementExists(step.element);
  });
}

function enhancePopover(popover: PopoverDOM, t: TourTranslate, instance: Driver) {
  popover.wrapper.classList.add('wewin-tour-popover');

  if (!popover.wrapper.querySelector('.wewin-tour-mascot')) {
    const mascot = document.createElement('img');
    mascot.className = 'wewin-tour-mascot';
    mascot.src = '/images/tour/wewin-knight.png';
    mascot.alt = '';
    mascot.setAttribute('aria-hidden', 'true');
    mascot.draggable = false;
    popover.wrapper.prepend(mascot);
  }

  if (!popover.footer.querySelector('.wewin-tour-skip')) {
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'wewin-tour-skip';
    skip.innerHTML = `<i class="fas fa-xmark" aria-hidden="true"></i><span>${t('tour.skip')}</span>`;
    skip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      instance.destroy();
    });
    popover.footer.appendChild(skip);
  }

  if (!popover.footer.querySelector('.wewin-tour-hint')) {
    const hint = document.createElement('p');
    hint.className = 'wewin-tour-hint';
    hint.textContent = t('tour.tapToContinue');
    popover.footer.appendChild(hint);
  }
}

export type StartTourOptions = {
  steps: DriveStep[];
  t: TourTranslate;
  /** localStorage flag written when the tour finishes or is dismissed. */
  doneKey: string;
};

/** Start a driver.js tour with the shared WeWIN popover styling and behaviour. */
export function startTour({ steps, t, doneKey }: StartTourOptions): Driver | null {
  if (typeof window === 'undefined') return null;

  stopActiveTour();

  const resolvedSteps = filterExistingSteps(steps);
  if (resolvedSteps.length === 0) return null;

  const instance = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 12,
    allowClose: true,
    // Tap the dimmed screen (or the highlighted target) to advance.
    overlayClickBehavior: 'nextStep',
    advanceOnClick: true,
    disableActiveInteraction: true,
    popoverClass: 'wewin-tour-popover',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done'),
    progressText: '{{current}} / {{total}}',
    steps: resolvedSteps,
    onPopoverRender: (popover, { driver: activeDriver }) => {
      enhancePopover(popover, t, activeDriver);
      // Mascot/footer extras change popover size after the first layout pass.
      requestAnimationFrame(() => {
        activeDriver.refresh();
      });
    },
    onHighlighted: (_element, _step, { driver: activeDriver }) => {
      requestAnimationFrame(() => {
        activeDriver.refresh();
      });
    },
    onDestroyed: () => {
      markTourDone(doneKey);
      if (activeTour === instance) activeTour = null;
    },
  });

  activeTour = instance;
  instance.drive();
  return instance;
}

export function stopActiveTour(): void {
  if (!activeTour) return;
  const current = activeTour;
  activeTour = null;
  current.destroy();
}
