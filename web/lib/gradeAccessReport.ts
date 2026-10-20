import {
  GLOBAL_SUCCESS_GRADES,
  formatVnReportDate,
  type GlobalSuccessGrade,
} from '@/lib/guestAccessWeek';

export const ACCESS_REPORT_RECIPIENTS = [
  'admin@wewin.edu.vn',
  'officemanager@wewin.edu.vn',
  'teachers@wewin.edu.vn',
  'prin@wewin.edu.vn',
] as const;

export const ACCESS_AUDIENCES = ['guest', 'student', 'teacher'] as const;
export type AccessAudience = (typeof ACCESS_AUDIENCES)[number];

export const ACCESS_AUDIENCE_LABELS: Record<AccessAudience, string> = {
  guest: 'Khách (guest)',
  student: 'Học viên / học sinh',
  teacher: 'Giáo viên',
};

/** Admin accounts are not counted. */
export function accessAudienceForRole(role: unknown): AccessAudience | null {
  if (role === 'admin') return null;
  if (role === 'teacher') return 'teacher';
  return 'student';
}

export function isAccessAudience(value: unknown): value is AccessAudience {
  return typeof value === 'string' && (ACCESS_AUDIENCES as readonly string[]).includes(value);
}

export type GradeCounts = Record<GlobalSuccessGrade, number>;

export type AccessReportData = {
  weekStart: string;
  weekEnd: string;
  /** Visitors per audience per grade (one visitor counted once per grade). */
  counts: Record<AccessAudience, GradeCounts>;
  /** Distinct visitors per audience across grades 6–9. */
  unique: Record<AccessAudience, number>;
};

export function emptyGradeCounts(): GradeCounts {
  return { 6: 0, 7: 0, 8: 0, 9: 0 };
}

export function emptyAccessCounts(): Record<AccessAudience, GradeCounts> {
  return { guest: emptyGradeCounts(), student: emptyGradeCounts(), teacher: emptyGradeCounts() };
}

export function emptyAccessUnique(): Record<AccessAudience, number> {
  return { guest: 0, student: 0, teacher: 0 };
}

export function gradeTotal(counts: Record<AccessAudience, GradeCounts>, grade: GlobalSuccessGrade) {
  return ACCESS_AUDIENCES.reduce((sum, audience) => sum + counts[audience][grade], 0);
}

export function uniqueTotal(unique: Record<AccessAudience, number>) {
  return ACCESS_AUDIENCES.reduce((sum, audience) => sum + unique[audience], 0);
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

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const NOTES = [
  'Khách là người vào web khi chưa đăng nhập (đếm theo trình duyệt).',
  'Học viên / học sinh và giáo viên được đếm theo tài khoản đăng nhập; tài khoản admin không tính.',
  'Mỗi người được tính một lần cho mỗi lớp trong tuần, dù vào nhiều lần.',
  'Dòng "Số người khác nhau" đếm mỗi người một lần dù vào nhiều lớp 6, 7, 8, 9.',
];

export function buildAccessReportEmail(report: AccessReportData): {
  subject: string;
  text: string;
  html: string;
} {
  const startLabel = formatVnReportDate(report.weekStart);
  const endLabel = formatVnReportDate(report.weekEnd);
  const header = ['Lớp', ...ACCESS_AUDIENCES.map((a) => ACCESS_AUDIENCE_LABELS[a]), 'Tổng'];
  const rows = GLOBAL_SUCCESS_GRADES.map((grade) => [
    `Global Success ${grade}`,
    ...ACCESS_AUDIENCES.map((a) => String(report.counts[a][grade])),
    String(gradeTotal(report.counts, grade)),
  ]);
  const uniqueRow = [
    'Số người khác nhau',
    ...ACCESS_AUDIENCES.map((a) => String(report.unique[a])),
    String(uniqueTotal(report.unique)),
  ];

  const title = 'Báo cáo truy cập Games Global Success 6 tới 9';
  const weekLine = `Tuần: ${startLabel} – ${endLabel} (thứ Hai đến Chủ nhật, giờ Việt Nam)`;
  const footer = 'Email này được gửi tự động lúc 9:00 sáng thứ Ba hàng tuần.';

  const text = [
    title,
    weekLine,
    '',
    ...GLOBAL_SUCCESS_GRADES.map((grade, i) => {
      const parts = ACCESS_AUDIENCES.map(
        (a, j) => `${ACCESS_AUDIENCE_LABELS[a]} ${rows[i][j + 1]}`,
      );
      return `Global Success ${grade}: ${parts.join(' · ')} · Tổng ${rows[i][rows[i].length - 1]}`;
    }),
    `Số người khác nhau: ${ACCESS_AUDIENCES.map(
      (a) => `${ACCESS_AUDIENCE_LABELS[a]} ${report.unique[a]}`,
    ).join(' · ')} · Tổng ${uniqueTotal(report.unique)}`,
    '',
    ...NOTES,
    '',
    footer,
  ].join('\n');

  const cell = (value: string, tag: 'td' | 'th', bold = false) =>
    `<${tag} style="border:1px solid #d0d7de;padding:6px 10px;text-align:${
      tag === 'th' || value.startsWith('Global') || value.startsWith('Số') ? 'left' : 'right'
    };${bold ? 'font-weight:bold;' : ''}">${escapeHtml(value)}</${tag}>`;
  const html = [
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2328">`,
    `<h2 style="margin:0 0 4px">${escapeHtml(title)}</h2>`,
    `<p style="margin:0 0 12px">${escapeHtml(weekLine)}</p>`,
    `<table style="border-collapse:collapse">`,
    `<tr style="background:#f6f8fa">${header.map((h) => cell(h, 'th')).join('')}</tr>`,
    ...rows.map((row) => `<tr>${row.map((v) => cell(v, 'td')).join('')}</tr>`),
    `<tr style="background:#f6f8fa">${uniqueRow.map((v) => cell(v, 'td', true)).join('')}</tr>`,
    `</table>`,
    `<ul style="color:#57606a;padding-left:18px">${NOTES.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`,
    `<p style="color:#57606a">${escapeHtml(footer)}</p>`,
    `</div>`,
  ].join('');

  return {
    subject: `[WeWIN Games] Báo cáo truy cập Global Success 6–9 tuần ${startLabel} – ${endLabel}`,
    text,
    html,
  };
}
