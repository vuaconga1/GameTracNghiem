import {
  GLOBAL_SUCCESS_GRADES,
  formatVnReportDate,
  type GlobalSuccessGrade,
} from '@/lib/guestAccessWeek';

export const GUEST_ACCESS_REPORT_RECIPIENTS = [
  'admin@wewin.edu.vn',
  'officemanager@wewin.edu.vn',
  'teachers@wewin.edu.vn',
  'prin@wewin.edu.vn',
] as const;

export type GuestAccessCounts = Record<GlobalSuccessGrade, number>;

export function emptyGuestAccessCounts(): GuestAccessCounts {
  return { 6: 0, 7: 0, 8: 0, 9: 0 };
}

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function readReportSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = env.REPORT_SMTP_HOST?.trim() || '';
  const user = env.REPORT_SMTP_USER?.trim() || '';
  const pass = env.REPORT_SMTP_PASS?.trim() || '';
  const from = env.REPORT_SMTP_FROM?.trim() || '';
  const port = Number(env.REPORT_SMTP_PORT || 587);
  if (!host || !user || !pass || !from || !Number.isFinite(port)) return null;
  return { host, port, user, pass, from };
}

export function buildGuestAccessReportEmail(input: {
  weekStart: string;
  weekEnd: string;
  counts: GuestAccessCounts;
  uniqueGuests: number;
}): { subject: string; text: string } {
  const startLabel = formatVnReportDate(input.weekStart);
  const endLabel = formatVnReportDate(input.weekEnd);
  const lines = GLOBAL_SUCCESS_GRADES.map(
    (grade) => `Global Success ${grade}: ${input.counts[grade]} khách`,
  );

  return {
    subject: `[WeWIN Games] Báo cáo khách truy cập Global Success 6–9 tuần ${startLabel} – ${endLabel}`,
    text: [
      'Báo cáo truy cập Games Global Success 6 tới 9',
      `Tuần: ${startLabel} – ${endLabel} (thứ Hai đến Chủ nhật, giờ Việt Nam)`,
      '',
      ...lines,
      `Tổng khách khác nhau: ${input.uniqueGuests}`,
      '',
      'Khách là người vào web khi chưa đăng nhập.',
      'Mỗi khách được tính một lần cho mỗi lớp trong tuần, dù vào nhiều lần.',
      'Tổng là số khách khác nhau đã vào ít nhất một lớp 6, 7, 8 hoặc 9.',
      '',
      'Email này được gửi lúc 9:00 sáng thứ Ba hàng tuần.',
    ].join('\n'),
  };
}
