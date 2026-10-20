'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import {
  ACCESS_AUDIENCES,
  ACCESS_AUDIENCE_LABELS,
  ACCESS_REPORT_RECIPIENTS,
  gradeTotal,
  uniqueTotal,
  type AccessReportData,
} from '@/lib/gradeAccessReport';
import {
  GLOBAL_SUCCESS_GRADES,
  addCalendarDays,
  formatVnReportDate,
  vnWeekStartDate,
} from '@/lib/guestAccessWeek';

const WEEK_OPTIONS = 12;

export function AccessReport({ displayName }: { displayName: string }) {
  const weeks = useMemo(() => {
    const current = vnWeekStartDate();
    return Array.from({ length: WEEK_OPTIONS }, (_, i) => addCalendarDays(current, -7 * i));
  }, []);
  const [week, setWeek] = useState(weeks[1]);
  const [report, setReport] = useState<AccessReportData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError('');
    void fetch(`/api/admin/access-report?week=${week}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setError(data.message || 'Không tải được báo cáo');
          return;
        }
        setReport(data.report as AccessReportData);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được báo cáo');
      });
    return () => {
      cancelled = true;
    };
  }, [week]);

  return (
    <AdminShell
      displayName={displayName}
      title="Báo cáo truy cập"
      subtitle="Games Global Success 6 tới 9 — khách, học viên / học sinh và giáo viên theo tuần"
    >
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <select
          className="admin-toolbar-input"
          value={week}
          onChange={(event) => setWeek(event.target.value)}
          aria-label="Chọn tuần"
        >
          {weeks.map((start, i) => (
            <option key={start} value={start}>
              {formatVnReportDate(start)} – {formatVnReportDate(addCalendarDays(start, 6))}
              {i === 0 ? ' (tuần này, chưa kết thúc)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-panel">
        {error ? null : report === null ? (
          <DataLoading />
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Lớp</th>
                    {ACCESS_AUDIENCES.map((audience) => (
                      <th key={audience}>{ACCESS_AUDIENCE_LABELS[audience]}</th>
                    ))}
                    <th>Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {GLOBAL_SUCCESS_GRADES.map((grade) => (
                    <tr key={grade}>
                      <td>Global Success {grade}</td>
                      {ACCESS_AUDIENCES.map((audience) => (
                        <td key={audience}>{report.counts[audience][grade]}</td>
                      ))}
                      <td>
                        <strong>{gradeTotal(report.counts, grade)}</strong>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Số người khác nhau</strong>
                    </td>
                    {ACCESS_AUDIENCES.map((audience) => (
                      <td key={audience}>
                        <strong>{report.unique[audience]}</strong>
                      </td>
                    ))}
                    <td>
                      <strong>{uniqueTotal(report.unique)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="help" style={{ color: 'var(--admin-muted)', paddingLeft: 18 }}>
              <li>Khách là người vào web khi chưa đăng nhập (đếm theo trình duyệt).</li>
              <li>
                Học viên / học sinh và giáo viên được đếm theo tài khoản đăng nhập; tài khoản admin
                không tính.
              </li>
              <li>Mỗi người được tính một lần cho mỗi lớp trong tuần, dù vào nhiều lần.</li>
              <li>
                Báo cáo tuần trước được gửi tự động lúc 9:00 sáng thứ Ba tới{' '}
                {ACCESS_REPORT_RECIPIENTS.join(', ')}.
              </li>
            </ul>
          </>
        )}
      </div>
    </AdminShell>
  );
}
