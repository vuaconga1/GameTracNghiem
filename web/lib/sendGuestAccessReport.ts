import 'server-only';

import nodemailer from 'nodemailer';

import { prisma } from '@/lib/db';
import {
  buildGuestAccessReportEmail,
  emptyGuestAccessCounts,
  GUEST_ACCESS_REPORT_RECIPIENTS,
  readReportSmtpConfig,
  type GuestAccessCounts,
} from '@/lib/guestAccessReport';
import { previousVnWeekRange, type GlobalSuccessGrade } from '@/lib/guestAccessWeek';

export async function loadGuestAccessReport(now = new Date()) {
  const week = previousVnWeekRange(now);
  const grouped = await prisma.guestGradeVisit.groupBy({
    by: ['grade'],
    where: { weekStart: week.start },
    _count: { _all: true },
  });
  const counts = emptyGuestAccessCounts();
  for (const row of grouped) {
    const grade = row.grade as GlobalSuccessGrade;
    if (grade in counts) counts[grade] = row._count._all;
  }
  const uniqueGuests = await prisma.guestGradeVisit
    .findMany({
      where: { weekStart: week.start },
      distinct: ['visitorKey'],
      select: { visitorKey: true },
    })
    .then((rows) => rows.length);

  return {
    week,
    counts,
    uniqueGuests,
    email: buildGuestAccessReportEmail({
      weekStart: week.start,
      weekEnd: week.end,
      counts,
      uniqueGuests,
    }),
  };
}

export async function sendGuestAccessReport(now = new Date()) {
  const smtp = readReportSmtpConfig();
  if (!smtp) {
    throw new Error(
      'Thiếu REPORT_SMTP_HOST, REPORT_SMTP_USER, REPORT_SMTP_PASS hoặc REPORT_SMTP_FROM',
    );
  }

  const report = await loadGuestAccessReport(now);
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transport.sendMail({
    from: smtp.from,
    to: [...GUEST_ACCESS_REPORT_RECIPIENTS],
    subject: report.email.subject,
    text: report.email.text,
  });

  return {
    week: report.week,
    counts: report.counts satisfies GuestAccessCounts,
    uniqueGuests: report.uniqueGuests,
    recipients: GUEST_ACCESS_REPORT_RECIPIENTS,
  };
}
