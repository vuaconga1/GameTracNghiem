import { describe, expect, it } from 'vitest';

import {
  GUEST_ACCESS_REPORT_RECIPIENTS,
  buildGuestAccessReportEmail,
  emptyGuestAccessCounts,
  readReportSmtpConfig,
} from './guestAccessReport';

describe('guestAccessReport', () => {
  it('lists guest counts for Global Success 6 to 9', () => {
    const counts = emptyGuestAccessCounts();
    counts[6] = 4;
    counts[8] = 2;
    const email = buildGuestAccessReportEmail({
      weekStart: '2026-10-05',
      weekEnd: '2026-10-11',
      counts,
      uniqueGuests: 5,
    });

    expect(email.subject).toContain('05/10/2026 – 11/10/2026');
    expect(email.text).toContain('Global Success 6: 4 khách');
    expect(email.text).toContain('Global Success 7: 0 khách');
    expect(email.text).toContain('Global Success 8: 2 khách');
    expect(email.text).toContain('Global Success 9: 0 khách');
    expect(email.text).toContain('Tổng khách khác nhau: 5');
    expect(GUEST_ACCESS_REPORT_RECIPIENTS).toEqual([
      'admin@wewin.edu.vn',
      'officemanager@wewin.edu.vn',
      'teachers@wewin.edu.vn',
      'prin@wewin.edu.vn',
    ]);
  });

  it('requires the full SMTP settings before a report can be sent', () => {
    expect(readReportSmtpConfig({})).toBeNull();
    expect(
      readReportSmtpConfig({
        REPORT_SMTP_HOST: 'smtp.example.com',
        REPORT_SMTP_PORT: '587',
        REPORT_SMTP_USER: 'mailer@wewin.edu.vn',
        REPORT_SMTP_PASS: 'secret',
        REPORT_SMTP_FROM: 'WeWIN Games <mailer@wewin.edu.vn>',
      }),
    ).toMatchObject({ host: 'smtp.example.com', port: 587 });
  });
});
