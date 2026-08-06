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
  SPEAKING_ACTIVITY_TYPES,
  type SpeakingActivityType,
} from '@/lib/speaking/config';
import {
  speakingActivityPath,
  speakingLoginHref,
} from '@/lib/speaking/hubRoutes';

type ActivityDefinition = {
  activityType: SpeakingActivityType;
  icon: string;
  tone: string;
  titleKey: string;
  descriptionKey: string;
  difficultyKey: string;
  durationKey: string;
};

export const SPEAKING_HUB_ACTIVITIES: readonly ActivityDefinition[] = [
  {
    activityType: 'WORD_PRONUNCIATION',
    icon: 'fas fa-volume-high',
    tone: 'word',
    titleKey: 'speaking.hub.activities.word.title',
    descriptionKey: 'speaking.hub.activities.word.description',
    difficultyKey: 'speaking.hub.difficulty.beginner',
    durationKey: 'speaking.hub.duration.oneMinute',
  },
  {
    activityType: 'SENTENCE_READING',
    icon: 'fas fa-book-open-reader',
    tone: 'sentence',
    titleKey: 'speaking.hub.activities.sentence.title',
    descriptionKey: 'speaking.hub.activities.sentence.description',
    difficultyKey: 'speaking.hub.difficulty.easy',
    durationKey: 'speaking.hub.duration.twoMinutes',
  },
  {
    activityType: 'GUIDED_ANSWER',
    icon: 'fas fa-message',
    tone: 'guided',
    titleKey: 'speaking.hub.activities.guided.title',
    descriptionKey: 'speaking.hub.activities.guided.description',
    difficultyKey: 'speaking.hub.difficulty.medium',
    durationKey: 'speaking.hub.duration.threeMinutes',
  },
  {
    activityType: 'REALTIME_CONVERSATION',
    icon: 'fas fa-comments',
    tone: 'conversation',
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
        SPEAKING_ACTIVITY_TYPES.map(async (activityType) => {
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

      <div className="speaking-hub-shell">
        <header className="speaking-hub-hero">
          <div className="speaking-hub-hero-icon" aria-hidden="true">
            <i className="fas fa-microphone-lines" />
          </div>
          <div>
            <p className="speaking-hub-eyebrow">{t('speaking.hub.eyebrow')}</p>
            <h1>{t('speaking.hub.title')}</h1>
            <p>
              {courseName
                ? t('speaking.hub.subtitleWithCourse', { course: courseName })
                : t('speaking.hub.subtitle')}
            </p>
          </div>
        </header>

        {loading ? (
          <DataLoading />
        ) : (
          <>
            {loadError ? (
              <div className="speaking-banner speaking-banner--warn" role="alert">
                <i className="fas fa-triangle-exclamation" aria-hidden="true" />
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
  const { t, locale } = useI18n();
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
        className="speaking-hub-grid"
        aria-label={t('speaking.hub.activityListAria')}
      >
        {SPEAKING_HUB_ACTIVITIES.map((activity) => {
          const access = accessByActivity[activity.activityType];
          const href = speakingActivityPath(courseId, activity.activityType);
          const title = t(activity.titleKey);
          const cardContent = (
            <>
              <div
                className={`speaking-hub-card-icon speaking-hub-card-icon--${activity.tone}`}
                aria-hidden="true"
              >
                <i className={activity.icon} />
              </div>
              <div className="speaking-hub-card-body">
                <div className="speaking-hub-card-heading">
                  <h2>{title}</h2>
                  <span
                    className={`speaking-hub-status ${
                      access?.allowed ? 'is-enabled' : 'is-locked'
                    }`}
                  >
                    <i
                      className={
                        access?.allowed
                          ? 'fas fa-circle-check'
                          : 'fas fa-lock'
                      }
                      aria-hidden="true"
                    />
                    {access === null || access === undefined
                      ? t('speaking.hub.statusUnavailable')
                      : access.allowed
                        ? t('speaking.hub.enabled')
                        : t('speaking.hub.locked')}
                  </span>
                </div>
                <p className="speaking-hub-card-description">
                  {t(activity.descriptionKey)}
                </p>
                <div className="speaking-hub-card-meta">
                  <span>
                    <i className="fas fa-signal" aria-hidden="true" />
                    {t('speaking.hub.difficultyLabel')}:{' '}
                    {t(activity.difficultyKey)}
                  </span>
                  <span>
                    <i className="fas fa-clock" aria-hidden="true" />
                    {t(activity.durationKey)}
                  </span>
                </div>
                {access?.quota ? (
                  <div className="speaking-hub-quota">
                    <span>
                      {t('speaking.hub.quotaRemaining', {
                        remaining: access.quota.remaining,
                        limit: access.quota.limit,
                      })}
                    </span>
                    <span>
                      {t('speaking.hub.quotaUsed', {
                        used: access.quota.used,
                        limit: access.quota.limit,
                      })}
                    </span>
                  </div>
                ) : null}
                {access?.entitlementExpiresAt ? (
                  <p className="speaking-hub-expiry">
                    <i className="fas fa-calendar-check" aria-hidden="true" />
                    {t('speaking.hub.entitlementExpiry', {
                      date: new Intl.DateTimeFormat(
                        locale === 'en' ? 'en-US' : 'vi-VN',
                        {
                          dateStyle: 'medium',
                          timeZone: 'Asia/Ho_Chi_Minh',
                        },
                      ).format(new Date(access.entitlementExpiresAt)),
                    })}
                  </p>
                ) : null}
              </div>
              <i
                className="fas fa-chevron-right speaking-hub-card-arrow"
                aria-hidden="true"
              />
            </>
          );

          if (access?.allowed) {
            return (
              <Link
                key={activity.activityType}
                href={href}
                className="speaking-hub-card"
                data-speaking-activity={activity.activityType}
                aria-label={t('speaking.hub.openActivityAria', {
                  activity: title,
                })}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <button
              key={activity.activityType}
              type="button"
              className="speaking-hub-card speaking-hub-card--locked"
              data-speaking-activity={activity.activityType}
              aria-label={t('speaking.hub.lockedActivityAria', {
                activity: title,
              })}
              aria-haspopup={access ? 'dialog' : undefined}
              disabled={!access}
              onClick={(event) => openModal(activity, event)}
            >
              {cardContent}
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

  const key =
    reason === 'ALLOWED' ? 'FEATURE_DISABLED' : reason;

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
        <h2 id="speaking-access-title">
          {t(`speaking.access.${key}.title`)}
        </h2>
        <p id="speaking-access-detail">
          {t(`speaking.access.${key}.detail`)}
        </p>
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
