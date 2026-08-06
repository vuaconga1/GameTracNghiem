'use client';

import Link from 'next/link';

import { useI18n } from '@/components/i18n/I18nProvider';
import type { SpeakingAccessReason } from '@/lib/speaking/access';
import {
  speakingActivityPath,
  speakingHubPath,
  speakingLoginHref,
} from '@/lib/speaking/hubRoutes';

const ICONS: Record<
  Exclude<SpeakingAccessReason, 'ALLOWED' | 'DAILY_LIMIT_REACHED'>,
  string
> = {
  LOGIN_REQUIRED: 'fas fa-right-to-bracket',
  NOT_WEWIN_STUDENT: 'fas fa-user-shield',
  NO_ACTIVE_COURSE: 'fas fa-lock',
  COURSE_EXPIRED: 'fas fa-calendar-xmark',
  ACCOUNT_SUSPENDED: 'fas fa-circle-pause',
  FEATURE_DISABLED: 'fas fa-toggle-off',
};

export function SpeakingAccessNotice({
  reason,
  courseId,
}: {
  reason: Exclude<SpeakingAccessReason, 'ALLOWED' | 'DAILY_LIMIT_REACHED'>;
  courseId: string;
}) {
  const { t } = useI18n();
  const nextPath = speakingActivityPath(courseId, 'REALTIME_CONVERSATION');
  return (
    <div className="speaking-blocked">
      <div className="speaking-banner speaking-banner--warn" role="status">
        <i className={ICONS[reason]} aria-hidden="true" />
        <div>
          <strong>{t(`speaking.access.${reason}.title`)}</strong>
          <p>{t(`speaking.access.${reason}.detail`)}</p>
        </div>
      </div>
      <div className="speaking-actions">
        {reason === 'LOGIN_REQUIRED' ? (
          <Link
            className="admin-btn primary speaking-btn"
            href={speakingLoginHref(nextPath)}
          >
            <i className="fas fa-right-to-bracket" aria-hidden="true" />
            {t('speaking.hub.loginCta')}
          </Link>
        ) : (
          <Link className="admin-btn speaking-btn" href={speakingHubPath(courseId)}>
            <i className="fas fa-arrow-left" aria-hidden="true" />
            {t('speaking.backToSpeakingHub')}
          </Link>
        )}
      </div>
    </div>
  );
}
