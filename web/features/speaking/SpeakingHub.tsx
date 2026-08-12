'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PageBackButton } from '@/components/PageBackButton';
import type {
  SpeakingAccessReason,
  SpeakingAccessResult,
} from '@/lib/speaking/access';
import {
  type SpeakingActivityType,
} from '@/lib/speaking/config';
import {
  speakingActivityPath,
  speakingLoginHref,
} from '@/lib/speaking/hubRoutes';

type ActivityDefinition = {
  activityType: SpeakingActivityType;
  icon: string;
  iconClass: string;
  dataActivity: string;
  titleKey: string;
  descriptionKey: string;
  difficultyKey: string;
  durationKey: string;
};

export const SPEAKING_HUB_ACTIVITIES: readonly ActivityDefinition[] = [
  {
    activityType: 'REALTIME_CONVERSATION',
    icon: 'fas fa-comments',
    iconClass: 'skill-speaking',
    dataActivity: 'speaking-conversation',
    titleKey: 'speaking.hub.activities.conversation.title',
    descriptionKey: 'speaking.hub.activities.conversation.description',
    difficultyKey: 'speaking.hub.difficulty.challenge',
    durationKey: 'speaking.hub.duration.threeMinutes',
  },
] as const;

type AccessByActivity = Partial<
  Record<SpeakingActivityType, SpeakingAccessResult | null>
>;

type AccessResponse = {
  success?: boolean;
  message?: string;
  access?: SpeakingAccessResult;
};

function activityProgressLabel(
  access: SpeakingAccessResult | null | undefined,
  durationLabel: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (access === null || access === undefined) {
    return t('speaking.hub.statusUnavailable');
  }
  if (!access.allowed) {
    return t('speaking.hub.locked');
  }
  if (access.quota) {
    return `${access.quota.remaining}/${access.quota.limit}`;
  }
  return durationLabel;
}

export function SpeakingHub({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName?: string;
}) {
  const { t } = useI18n();
  const [accessByActivity, setAccessByActivity] = useState<AccessByActivity>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccess() {
      setLoading(true);
      setLoadError('');

      const entries = await Promise.all(
        SPEAKING_HUB_ACTIVITIES.map(async ({ activityType }) => {
          try {
            const response = await fetch(
              `/api/speaking/access?courseId=${encodeURIComponent(courseId)}&activityType=${activityType}`,
              { signal: controller.signal },
            );
            const body = (await response.json()) as AccessResponse;
            if (!response.ok || !body.success || !body.access) {
              throw new Error(body.message || t('speaking.hub.loadFailed'));
            }
            return [activityType, body.access] as const;
          } catch (error) {
            if (controller.signal.aborted) throw error;
            return [activityType, null] as const;
          }
        }),
      ).catch((error) => {
        if (controller.signal.aborted) return null;
        throw error;
      });

      if (!entries || controller.signal.aborted) return;
      const next = Object.fromEntries(entries) as AccessByActivity;
      setAccessByActivity(next);
      if (entries.some(([, access]) => access === null)) {
        setLoadError(t('speaking.hub.partialLoadFailed'));
      }
      setLoading(false);
    }

    void loadAccess();
    return () => controller.abort();
  }, [courseId, retryCount, t]);

  return (
    <section className="view-detail speaking-hub">
      <PageBackButton
        href={`/courses/${encodeURIComponent(courseId)}?skill=speaking`}
      />

      <div className="detail-body">
        <div className="book-card">
          <div className="book-card-top">
            <div className="book-thumb">
              <i className="fas fa-microphone-lines" aria-hidden="true" />
            </div>
            <div className="book-info">
              <h2>{courseName || t('speaking.hub.title')}</h2>
              <p>{t('skills.speaking')}</p>
            </div>
          </div>
        </div>

        <div className="detail-main-panel">
          <div className="detail-panel">
            <div className="activity-area">
              {loading ? (
                <DataLoading />
              ) : (
                <>
                  {loadError ? (
                    <div
                      className="speaking-banner speaking-banner--warn"
                      role="alert"
                    >
                      <i
                        className="fas fa-triangle-exclamation"
                        aria-hidden="true"
                      />
                      <span>{loadError}</span>
                      <button
                        type="button"
                        className="speaking-hub-retry"
                        onClick={() => setRetryCount((count) => count + 1)}
                      >
                        {t('common.retry')}
                      </button>
                    </div>
                  ) : null}

                  <SpeakingHubCards
                    courseId={courseId}
                    accessByActivity={accessByActivity}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SpeakingHubCards({
  courseId,
  accessByActivity,
}: {
  courseId: string;
  accessByActivity: AccessByActivity;
}) {
  const { t } = useI18n();
  const [blockedActivity, setBlockedActivity] =
    useState<ActivityDefinition | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const blockedAccess = blockedActivity
    ? accessByActivity[blockedActivity.activityType]
    : null;

  const closeModal = useCallback(() => {
    setBlockedActivity(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  function openModal(
    activity: ActivityDefinition,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    returnFocusRef.current = event.currentTarget;
    setBlockedActivity(activity);
  }

  return (
    <>
      <div
        className="activity-grid"
        aria-label={t('speaking.hub.activityListAria')}
        data-skill-step="speaking-hub"
      >
        <div className="skill-games-heading" style={{ gridColumn: '1 / -1' }}>
          {t('speaking.hub.title')}
        </div>
        {SPEAKING_HUB_ACTIVITIES.map((activity) => {
          const access = accessByActivity[activity.activityType];
          const href = speakingActivityPath(courseId, activity.activityType);
          const title = t(activity.titleKey);
          const progress = activityProgressLabel(
            access,
            t(activity.durationKey),
            t,
          );
          const locked = !access?.allowed;
          const className = locked
            ? 'activity-card activity-card--locked'
            : 'activity-card';

          const inner = (
            <>
              <div className="activity-left">
                <div
                  className={`activity-icon ${activity.iconClass}`}
                  aria-hidden="true"
                >
                  <i className={activity.icon} />
                </div>
                <span className="activity-label">{title}</span>
              </div>
              <span className="activity-progress">{progress}</span>
            </>
          );

          if (access?.allowed) {
            return (
              <Link
                key={activity.activityType}
                href={href}
                className={className}
                data-activity={activity.dataActivity}
                data-speaking-activity={activity.activityType}
                title={t(activity.descriptionKey)}
                aria-label={t('speaking.hub.openActivityAria', {
                  activity: title,
                })}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={activity.activityType}
              type="button"
              className={className}
              data-activity={activity.dataActivity}
              data-speaking-activity={activity.activityType}
              title={t(activity.descriptionKey)}
              aria-label={t('speaking.hub.lockedActivityAria', {
                activity: title,
              })}
              aria-haspopup={access ? 'dialog' : undefined}
              disabled={!access}
              onClick={(event) => openModal(activity, event)}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {blockedActivity && blockedAccess ? (
        <SpeakingLockedModal
          activityTitle={t(blockedActivity.titleKey)}
          destination={speakingActivityPath(
            courseId,
            blockedActivity.activityType,
          )}
          courseId={courseId}
          reason={blockedAccess.reason}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}

export function SpeakingLockedModal({
  activityTitle,
  destination,
  courseId,
  reason,
  onClose,
}: {
  activityTitle: string;
  destination: string;
  courseId: string;
  reason: SpeakingAccessReason;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const key = reason === 'ALLOWED' ? 'FEATURE_DISABLED' : reason;

  return (
    <div
      className="speaking-hub-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="speaking-hub-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="speaking-access-title"
        aria-describedby="speaking-access-detail"
      >
        <button
          ref={closeRef}
          type="button"
          className="speaking-hub-modal-close"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
        <div className="speaking-hub-modal-icon" aria-hidden="true">
          <i className="fas fa-lock" />
        </div>
        <p className="speaking-hub-modal-activity">{activityTitle}</p>
        <h2 id="speaking-access-title">{t(`speaking.access.${key}.title`)}</h2>
        <p id="speaking-access-detail">{t(`speaking.access.${key}.detail`)}</p>
        <div className="speaking-hub-modal-actions">
          {reason === 'LOGIN_REQUIRED' ? (
            <Link
              className="admin-btn primary speaking-hub-modal-action"
              href={speakingLoginHref(destination)}
            >
              <i className="fas fa-right-to-bracket" aria-hidden="true" />
              {t('speaking.hub.loginCta')}
            </Link>
          ) : null}
          <Link
            className="admin-btn speaking-hub-modal-action"
            href={`/courses/${encodeURIComponent(courseId)}`}
          >
            <i className="fas fa-gamepad" aria-hidden="true" />
            {t('speaking.hub.continueGames')}
          </Link>
        </div>
      </div>
    </div>
  );
}
