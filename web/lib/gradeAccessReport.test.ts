import { describe, expect, it } from 'vitest';

import {
  ACCESS_REPORT_RECIPIENTS,
  accessAudienceForRole,
  buildAccessReportEmail,
  emptyAccessCounts,
  emptyAccessUnique,
  readReportSmtpConfig,
} from './gradeAccessReport';

describe('gradeAccessReport', () => {
  it('maps roles to report audiences and skips admins', () => {
    expect(accessAudienceForRole('teacher')).toBe('teacher');
    expect(accessAudienceForRole('WewinStudent')).toBe('student');
    expect(accessAudienceForRole('LogisticsStudent')).toBe('student');
    expect(accessAudienceForRole('admin')).toBeNull();
  });

  it('lists guest, student and teacher counts for Global Success 6 to 9', () => {
    const counts = emptyAccessCounts();
    counts.guest[6] = 4;
    counts.student[6] = 10;
    counts.teacher[8] = 2;
    const unique = emptyAccessUnique();
    unique.guest = 4;
    unique.student = 9;
    unique.teacher = 1;
    const email = buildAccessReportEmail({
      weekStart: '2026-10-05',
      weekEnd: '2026-10-11',
      counts,
      unique,
    });

    expect(email.subject).toContain('05/10/2026 – 11/10/2026');
    expect(email.text).toContain(
      'Global Success 6: Khách (guest) 4 · Học viên / học sinh 10 · Giáo viên 0 · Tổng 14',
    );
    expect(email.text).toContain(
      'Global Success 8: Khách (guest) 0 · Học viên / học sinh 0 · Giáo viên 2 · Tổng 2',
    );
    expect(email.text).toContain(
      'Số người khác nhau: Khách (guest) 4 · Học viên / học sinh 9 · Giáo viên 1 · Tổng 14',
    );
    expect(email.html).toContain('<table');
    expect(email.html).toContain('Global Success 9');
    expect(ACCESS_REPORT_RECIPIENTS).toEqual([
      'admin@wewin.edu.vn',
      'officemanager@wewin.edu.vn',
      'teachers@wewin.edu.vn',
      'prin@wewin.edu.vn',
    ]);
  });

  it('requires the full SMTP settings before a report can be sent', () => {
    expect(readReportSmtpConfig({ NODE_ENV: 'test' })).toBeNull();
    expect(
      readReportSmtpConfig({
        NODE_ENV: 'test',
        REPORT_SMTP_HOST: 'smtp.example.com',
        REPORT_SMTP_PORT: '587',
        REPORT_SMTP_USER: 'mailer@wewin.edu.vn',
        REPORT_SMTP_PASS: 'secret',
        REPORT_SMTP_FROM: 'WeWIN Games <mailer@wewin.edu.vn>',
      }),
    ).toMatchObject({ host: 'smtp.example.com', port: 587 });
  });
});
