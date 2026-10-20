import 'server-only';

import nodemailer from 'nodemailer';

import { prisma } from '@/lib/db';
import {
  ACCESS_REPORT_RECIPIENTS,
  buildAccessReportEmail,
  emptyAccessCounts,
  emptyAccessUnique,
  isAccessAudience,
  readReportSmtpConfig,
  type AccessReportData,
} from '@/lib/gradeAccessReport';
import {
  addCalendarDays,
  previousVnWeekRange,
  type GlobalSuccessGrade,
} from '@/lib/guestAccessWeek';

/** Counts for the Monday–Sunday week starting `weekStart` (YYYY-MM-DD). */
export async function loadGradeAccessReport(weekStart: string): Promise<AccessReportData> {
  const [byGrade, byVisitor] = await Promise.all([
    prisma.gradeAccessVisit.groupBy({
      by: ['audience', 'grade'],
      where: { weekStart },
      _count: { _all: true },
    }),
    prisma.gradeAccessVisit.groupBy({
      by: ['audience', 'visitorKey'],
      where: { weekStart },
    }),
  ]);

  const counts = emptyAccessCounts();
  for (const row of byGrade) {
    if (!isAccessAudience(row.audience)) continue;
    const grade = row.grade as GlobalSuccessGrade;
    if (grade in counts[row.audience]) counts[row.audience][grade] = row._count._all;
  }
  const unique = emptyAccessUnique();
  for (const row of byVisitor) {
    if (isAccessAudience(row.audience)) unique[row.audience] += 1;
  }

  return { weekStart, weekEnd: addCalendarDays(weekStart, 6), counts, unique };
}

export async function sendGradeAccessReport(now = new Date()) {
  const smtp = readReportSmtpConfig();
  if (!smtp) {
    throw new Error(
      'Thiếu REPORT_SMTP_HOST, REPORT_SMTP_USER, REPORT_SMTP_PASS hoặc REPORT_SMTP_FROM',
    );
  }

  const report = await loadGradeAccessReport(previousVnWeekRange(now).start);
  const email = buildAccessReportEmail(report);
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transport.sendMail({
    from: smtp.from,
    to: [...ACCESS_REPORT_RECIPIENTS],
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return { ...report, recipients: ACCESS_REPORT_RECIPIENTS };
}
