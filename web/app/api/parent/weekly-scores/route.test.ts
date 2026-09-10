import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyPortalSsoToken: vi.fn(),
  getParentWeeklyScore: vi.fn(),
}));

vi.mock('@/lib/portalSso', () => ({
  verifyPortalSsoToken: mocks.verifyPortalSsoToken,
}));

vi.mock('@/lib/parentWeeklyScores', () => ({
  getParentWeeklyScore: mocks.getParentWeeklyScore,
}));

import { GET, OPTIONS } from './route';

const PORTAL_ORIGIN = 'https://wewin.baobai.edu.vn';

function getRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: 'GET', headers });
}

describe('GET /api/parent/weekly-scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPortalSsoToken.mockResolvedValue({
      sid: 'HV-1602',
      name: 'An',
      pwd: '123',
    });
    mocks.getParentWeeklyScore.mockResolvedValue({
      ok: true,
      studentId: 'HV-1602',
      matched: true,
      weekKey: '2026-W17',
      isoWeek: 17,
      weekYear: 2026,
      rangeLabel: '20/04 – 26/04/2026',
      totalPoints: 1240,
      rank: 4,
      classSize: 18,
      rankScope: 'global',
      games: [{ key: 'grammar', name: 'Ngữ pháp', points: 380 }],
    });
  });

  it('answers CORS preflight for the Parent Portal origin', async () => {
    const res = await OPTIONS(
      new Request('http://localhost/api/parent/weekly-scores', {
        method: 'OPTIONS',
        headers: { origin: PORTAL_ORIGIN },
      })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PORTAL_ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });

  it('rejects missing Bearer token with 401 and CORS headers', async () => {
    const res = await GET(
      getRequest('http://localhost/api/parent/weekly-scores?weekKey=2026-W17', {
        origin: PORTAL_ORIGIN,
      })
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PORTAL_ORIGIN);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
    expect(mocks.getParentWeeklyScore).not.toHaveBeenCalled();
  });

  it('returns that student weekly payload for a valid SSO token', async () => {
    const res = await GET(
      getRequest('http://localhost/api/parent/weekly-scores?weekKey=2026-W17&studentId=HV-1602', {
        origin: PORTAL_ORIGIN,
        authorization: 'Bearer portal-jwt',
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.verifyPortalSsoToken).toHaveBeenCalledWith('portal-jwt');
    expect(mocks.getParentWeeklyScore).toHaveBeenCalledWith({
      studentId: 'HV-1602',
      weekYear: 2026,
      isoWeek: 17,
    });
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      matched: true,
      totalPoints: 1240,
      rankScope: 'global',
    });
  });

  it('forbids a studentId that does not match the SSO sid', async () => {
    const res = await GET(
      getRequest('http://localhost/api/parent/weekly-scores?weekKey=2026-W17&studentId=HV-0001', {
        authorization: 'Bearer portal-jwt',
      })
    );
    expect(res.status).toBe(403);
    expect(mocks.getParentWeeklyScore).not.toHaveBeenCalled();
  });

  it('accepts week+year query params', async () => {
    await GET(
      getRequest('http://localhost/api/parent/weekly-scores?week=17&year=2026', {
        authorization: 'Bearer portal-jwt',
      })
    );
    expect(mocks.getParentWeeklyScore).toHaveBeenCalledWith({
      studentId: 'HV-1602',
      weekYear: 2026,
      isoWeek: 17,
    });
  });
});
