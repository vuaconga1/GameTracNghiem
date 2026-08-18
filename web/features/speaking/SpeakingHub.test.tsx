import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/components/i18n/I18nProvider';
import type { SpeakingAccessResult } from '@/lib/speaking/access';
import type { SpeakingActivityType } from '@/lib/speaking/config';

import {
  SPEAKING_HUB_ACTIVITIES,
  speakingHubActivitiesForGrade,
  SpeakingHubCards,
  SpeakingLockedModal,
} from './SpeakingHub';

function allowedAccess(
  activityType: SpeakingActivityType,
  used: number,
  limit: number,
): SpeakingAccessResult {
  return {
    allowed: true,
    reason: 'ALLOWED',
    courseId: 'course-1',
    activityType,
    timezone: 'Asia/Ho_Chi_Minh',
    config: {
      dailyLimit: limit,
      durationSeconds:
        activityType === 'REALTIME_CONVERSATION' ? 180 : 60,
      reservationTtlSeconds: 120,
      promptVersion: 'v1',
    },
    quota: {
      activityType,
      used,
      reserved: 0,
      limit,
      remaining: limit - used,
    },
    entitlementExpiresAt: '2026-12-31T17:00:00.000Z',
  };
}

describe('SpeakingHubCards', () => {
  it('renders only the realtime conversation activity for grades 6–9', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SpeakingHubCards
          courseId="course-1"
          levelName="Lớp 8"
          accessByActivity={{
            REALTIME_CONVERSATION: allowedAccess(
              'REALTIME_CONVERSATION',
              1,
              2,
            ),
          }}
        />
      </I18nProvider>,
    );

    expect(SPEAKING_HUB_ACTIVITIES).toHaveLength(1);
    expect(html.match(/data-speaking-activity=/g)).toHaveLength(1);
    expect(html).not.toContain('Phát âm từ');
    expect(html).not.toContain('Đọc câu');
    expect(html).not.toContain('Trả lời có hướng dẫn');
    expect(html).toContain('Nói tự do');
    expect(html).toContain('class="activity-card"');
    expect(html).toContain('1/2');
    expect(html).not.toContain('1 lượt/ngày');
  });

  it('switches hub copy by grade band', () => {
    expect(
      speakingHubActivitiesForGrade(undefined, 'Lớp 4')[0].titleKey,
    ).toBe('speaking.hub.activities.sentenceCorrection.title');
    expect(speakingHubActivitiesForGrade(8)[0].titleKey).toBe(
      'speaking.hub.activities.conversation.title',
    );
  });

  it('renders sentence-pronunciation practice for grades 1–5', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SpeakingHubCards
          courseId="course-1"
          levelName="Lớp 3"
          accessByActivity={{
            REALTIME_CONVERSATION: allowedAccess(
              'REALTIME_CONVERSATION',
              0,
              2,
            ),
          }}
        />
      </I18nProvider>,
    );

    expect(html.match(/data-speaking-activity=/g)).toHaveLength(1);
    expect(html).toContain('Sửa phát âm câu');
    expect(html).not.toContain('Nói tự do');
    expect(html).not.toContain('Hội thoại Realtime');
  });

  it('locks the activity when its daily quota is exhausted', () => {
    const realtime = allowedAccess('REALTIME_CONVERSATION', 2, 2);
    realtime.allowed = false;
    realtime.reason = 'DAILY_LIMIT_REACHED';
    realtime.quota!.remaining = 0;

    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <SpeakingHubCards
          courseId="course-1"
          levelName="Lớp 8"
          accessByActivity={{
            REALTIME_CONVERSATION: realtime,
          }}
        />
      </I18nProvider>,
    );

    expect(html).not.toContain('href="/speaking/course-1/conversation"');
    expect(html).toContain('activity-card--locked');
  });
});

describe('SpeakingLockedModal', () => {
  it('renders the WeWIN guest explanation and safe login/continue actions', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SpeakingLockedModal
          activityTitle="Nói tự do"
          destination="/speaking/course-1/conversation"
          courseId="course-1"
          reason="LOGIN_REQUIRED"
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(
      'AI Speaking là quyền lợi dành riêng cho học sinh WeWIN.',
    );
    expect(html).toContain(
      'href="/login?next=%2Fspeaking%2Fcourse-1%2Fconversation"',
    );
    expect(html).toContain('Đăng nhập WeWIN');
    expect(html).toContain('Tiếp tục chơi game');
  });

  it('uses a distinct child-friendly daily-limit message', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SpeakingLockedModal
          activityTitle="Nói tự do"
          destination="/speaking/course-1/conversation"
          courseId="course-1"
          reason="DAILY_LIMIT_REACHED"
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(html).toContain('Hôm nay em đã luyện đủ lượt');
    expect(html).toContain(
      'Em vẫn có thể chọn các hoạt động Speaking khác còn lượt nhé.',
    );
    expect(html).not.toContain('Đăng nhập WeWIN');
  });
});
