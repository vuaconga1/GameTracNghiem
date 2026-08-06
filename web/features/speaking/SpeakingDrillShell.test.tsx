import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@/components/i18n/I18nProvider';

import {
  SpeakingDrillFeedback,
  SpeakingDrillMicState,
  SpeakingDrillShell,
} from './SpeakingDrillShell';

describe('SpeakingDrillShell UI states', () => {
  it('renders denied access without a mic request control', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SpeakingDrillShell
          courseId="course-1"
          activityType="WORD_PRONUNCIATION"
          accessReason="FEATURE_DISABLED"
        />
      </I18nProvider>,
    );

    expect(html).toContain('Hoạt động này chưa mở');
    expect(html).toContain('fa-lock');
    expect(html).not.toContain('Bắt đầu ghi âm');
    expect(html).not.toContain('fa-microphone');
  });

  it('renders the 3-2-1 state and a visible simple waveform', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <SpeakingDrillMicState
          state="countdown"
          countdown={3}
          waveform={[8, 12, 20, 12, 8]}
        />
      </I18nProvider>,
    );

    expect(html).toContain('Get ready');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('>3<');
    expect(html.match(/height:/g)).toHaveLength(5);
  });

  it('renders exactly one praise and one improvement', () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="vi">
        <SpeakingDrillFeedback
          result={{
            id: 'attempt-1',
            transcript: 'I recycle bottles.',
            score: 84,
            feedback: {
              label: 'Phản hồi luyện tập',
              praise: 'Em trả lời đúng trọng tâm.',
              improvement: 'Em hãy thêm một ví dụ.',
              disclaimer: 'Chỉ đánh giá nội dung bản chép lời.',
            },
          }}
        />
      </I18nProvider>,
    );

    expect(html.match(/Một điểm em làm tốt/g)).toHaveLength(1);
    expect(html.match(/Một điểm cần cải thiện/g)).toHaveLength(1);
    expect(html).toContain('Em trả lời đúng trọng tâm.');
    expect(html).toContain('Em hãy thêm một ví dụ.');
  });
});
