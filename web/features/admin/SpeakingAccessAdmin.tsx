'use client';

import { useCallback, useEffect, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { AdminStep } from '@/features/admin/AdminHelp';

type CourseOption = { id: string; name: string; levelName: string };

type EntitlementRow = {
  id: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  source: string;
  note?: string | null;
  revocationNote?: string | null;
  user: { username: string; displayName: string };
  course?: { id: string; name: string; levelName: string } | null;
  createdBy: { displayName: string };
};

type ConfigRow = {
  activityType: string;
  enabled: boolean;
  dailyLimit: number;
  durationSeconds: number;
  reservationTtlSeconds: number;
  promptVersion: string;
};

function vnDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const ACTIVITY_LABEL: Record<string, string> = {
  conversation: 'Hội thoại 5 phút',
  word: 'Luyện từ',
  sentence: 'Luyện câu',
  guided: 'Guided speaking',
};

export function SpeakingAccessAdmin({
  mode,
  courses,
}: {
  mode: 'entitlements' | 'config';
  courses: CourseOption[];
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [emergencyDisabled, setEmergencyDisabled] = useState(false);
  const [models, setModels] = useState<Record<string, string>>({});
  const [showGrant, setShowGrant] = useState(false);

  const [usernames, setUsernames] = useState('');
  const [courseId, setCourseId] = useState('');
  const [startsOn, setStartsOn] = useState(() => vnDateString(new Date()));
  const [expiresOn, setExpiresOn] = useState(() =>
    vnDateString(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
  );
  const [source, setSource] = useState('PILOT_ADMIN');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const path =
        mode === 'entitlements'
          ? '/api/admin/speaking/entitlements?limit=200'
          : '/api/admin/speaking/config';
      const response = await fetch(path);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không tải được dữ liệu Speaking');
      }
      if (mode === 'entitlements') {
        setEntitlements(json.entitlements || []);
      } else {
        setConfigs(json.configs || []);
        setEmergencyDisabled(json.emergencyDisabled === true);
        setModels(json.models || {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu Speaking');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function grant() {
    const studentCodes = usernames
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!studentCodes.length) {
      setError('Nhập ít nhất một mã học sinh Parent Portal');
      return;
    }

    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/speaking/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wewin-csrf': '1' },
        body: JSON.stringify({
          usernames: studentCodes,
          courseId: courseId || null,
          startsOn,
          expiresOn,
          source,
          note,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không cấp được quyền Speaking');
      }
      const missing =
        Array.isArray(json.missing) && json.missing.length
          ? `; không tìm thấy: ${json.missing.join(', ')}`
          : '';
      const successMessage = `Đã cấp ${json.granted} quyền, bỏ qua ${json.skippedExisting} quyền trùng${missing}`;
      setUsernames('');
      setShowGrant(false);
      await load();
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cấp được quyền Speaking');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(row: EntitlementRow) {
    const reason = prompt(`Lý do thu hồi quyền của ${row.user.username}:`);
    if (!reason?.trim()) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/speaking/entitlements/${row.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wewin-csrf': '1' },
        body: JSON.stringify({ note: reason.trim() }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không thu hồi được quyền');
      }
      await load();
      setMessage('Đã thu hồi và ghi nhận người thực hiện/lý do');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thu hồi được quyền');
    } finally {
      setBusy(false);
    }
  }

  async function importCodes(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const codes = text
      .split(/\r?\n/)
      .map((line) => line.split(/[;,\t]/, 1)[0].trim())
      .filter(
        (value) =>
          value &&
          !['username', 'studentcode', 'mã học sinh'].includes(value.toLowerCase()),
      );
    setUsernames([...new Set(codes)].join('\n'));
    setMessage(`Đã đọc ${new Set(codes).size} mã từ file; kiểm tra rồi bấm Cấp quyền`);
    setShowGrant(true);
  }

  function updateConfig(activityType: string, patch: Partial<ConfigRow>) {
    setConfigs((rows) =>
      rows.map((row) => (row.activityType === activityType ? { ...row, ...patch } : row)),
    );
  }

  async function saveConfig(row: ConfigRow) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/speaking/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-wewin-csrf': '1' },
        body: JSON.stringify(row),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Không lưu được cấu hình');
      }
      await load();
      setMessage(`Đã lưu ${ACTIVITY_LABEL[row.activityType] || row.activityType}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được cấu hình');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <DataLoading />;

  return (
    <div>
      {busy ? <DataLoading /> : null}
      {message ? <div className="admin-alert ok">{message}</div> : null}
      {error ? <div className="admin-alert error">{error}</div> : null}

      {mode === 'entitlements' ? (
        <>
          <div className="admin-toolbar">
            <span className="sheet-hint">
              Quyền chỉ có hiệu lực sau khi học sinh đăng nhập SSO ít nhất một lần.
            </span>
            <button
              type="button"
              className="admin-btn primary"
              onClick={() => setShowGrant((v) => !v)}
            >
              <i className="fas fa-user-plus" aria-hidden="true" />{' '}
              {showGrant ? 'Đóng form' : 'Cấp quyền mới'}
            </button>
          </div>

          {showGrant ? (
            <AdminStep
              step={1}
              title="Cấp quyền AI Speaking"
              help="Dán mã học sinh Parent Portal (mỗi dòng một mã) hoặc import CSV. Ngày kết thúc không bao gồm ngày đó."
            >
              <div className="speaking-form-grid">
                <label className="admin-field speaking-form-span">
                  <span>Mã học sinh</span>
                  <textarea
                    rows={5}
                    value={usernames}
                    onChange={(event) => setUsernames(event.target.value)}
                    placeholder={'WeWIN01-HV-1602\nWeWIN01-HV-1603'}
                  />
                </label>
                <label className="admin-field">
                  <span>Import CSV/TSV (cột đầu = mã)</span>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/plain"
                    onChange={(event) => void importCodes(event.target.files?.[0] || null)}
                  />
                </label>
                <label className="admin-field">
                  <span>Khóa học</span>
                  <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                    <option value="">Tất cả khóa đang hoạt động (quyền chung)</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.levelName} — {course.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Ngày bắt đầu</span>
                  <input
                    type="date"
                    value={startsOn}
                    onChange={(event) => setStartsOn(event.target.value)}
                  />
                </label>
                <label className="admin-field">
                  <span>Ngày kết thúc (không gồm ngày này)</span>
                  <input
                    type="date"
                    value={expiresOn}
                    onChange={(event) => setExpiresOn(event.target.value)}
                  />
                </label>
                <label className="admin-field">
                  <span>Nguồn cấp</span>
                  <input value={source} onChange={(event) => setSource(event.target.value)} />
                </label>
                <label className="admin-field speaking-form-span">
                  <span>Ghi chú kiểm toán</span>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <div className="speaking-form-actions">
                  <button
                    type="button"
                    className="admin-btn primary"
                    disabled={busy}
                    onClick={() => void grant()}
                  >
                    Cấp quyền
                  </button>
                  <button type="button" className="admin-btn" onClick={() => setShowGrant(false)}>
                    Hủy
                  </button>
                </div>
              </div>
            </AdminStep>
          ) : null}

          <div className="admin-panel sheet-panel">
            <div className="sheet-wrap">
              <table className="admin-table speaking-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Khóa</th>
                    <th>Hiệu lực</th>
                    <th>Trạng thái</th>
                    <th>Nguồn / người cấp</th>
                    <th style={{ width: 110 }} />
                  </tr>
                </thead>
                <tbody>
                  {entitlements.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="admin-empty">Chưa có quyền nào</div>
                      </td>
                    </tr>
                  ) : (
                    entitlements.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.user.displayName}
                          <div className="speaking-sub">{row.user.username}</div>
                        </td>
                        <td>
                          {row.course
                            ? `${row.course.levelName} — ${row.course.name}`
                            : 'Quyền chung'}
                        </td>
                        <td>
                          {new Date(row.startsAt).toLocaleDateString('vi-VN')} →{' '}
                          {new Date(row.expiresAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${
                              row.status === 'ACTIVE' || row.status === 'GRANTED' ? 'on' : 'off'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td>
                          {row.source}
                          <div className="speaking-sub">{row.createdBy.displayName}</div>
                        </td>
                        <td>
                          {row.status !== 'REVOKED' ? (
                            <button
                              type="button"
                              className="admin-btn danger"
                              disabled={busy}
                              onClick={() => void revoke(row)}
                            >
                              Thu hồi
                            </button>
                          ) : (
                            <span className="speaking-sub">{row.revocationNote || 'Đã thu hồi'}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className="admin-panel speaking-config-banner">
            <div>
              <strong>Kill switch khẩn cấp (env)</strong>
              <p>
                {emergencyDisabled
                  ? 'ON — học sinh đang bị chặn Speaking'
                  : 'OFF — Speaking đang chạy bình thường'}
              </p>
            </div>
            <div>
              <strong>Model đang dùng</strong>
              <p>
                Realtime: {models.realtime || '—'} · Transcription:{' '}
                {models.transcription || '—'} · Guided: {models.guided || '—'}
              </p>
            </div>
          </div>

          <div className="admin-panel sheet-panel">
            <div className="sheet-wrap">
              <table className="admin-table speaking-table">
                <thead>
                  <tr>
                    <th>Hoạt động</th>
                    <th style={{ width: 72 }}>Bật</th>
                    <th>Giới hạn/ngày</th>
                    <th>Thời lượng (giây)</th>
                    <th>TTL giữ lượt</th>
                    <th>Prompt version</th>
                    <th style={{ width: 100 }} />
                  </tr>
                </thead>
                <tbody>
                  {configs.map((row) => (
                    <tr key={row.activityType}>
                      <td>
                        <strong>{ACTIVITY_LABEL[row.activityType] || row.activityType}</strong>
                        <div className="speaking-sub">{row.activityType}</div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="sheet-check"
                          checked={row.enabled}
                          onChange={(event) =>
                            updateConfig(row.activityType, { enabled: event.target.checked })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="sheet-input"
                          type="number"
                          min={1}
                          max={1000}
                          value={row.dailyLimit}
                          onChange={(event) =>
                            updateConfig(row.activityType, {
                              dailyLimit: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="sheet-input"
                          type="number"
                          min={10}
                          max={3600}
                          value={row.durationSeconds}
                          onChange={(event) =>
                            updateConfig(row.activityType, {
                              durationSeconds: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="sheet-input"
                          type="number"
                          min={10}
                          max={3600}
                          value={row.reservationTtlSeconds}
                          onChange={(event) =>
                            updateConfig(row.activityType, {
                              reservationTtlSeconds: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="sheet-input"
                          value={row.promptVersion}
                          onChange={(event) =>
                            updateConfig(row.activityType, {
                              promptVersion: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn primary"
                          disabled={busy}
                          onClick={() => void saveConfig(row)}
                        >
                          Lưu
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
