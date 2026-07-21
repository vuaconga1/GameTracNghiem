import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  completeExperienceSession: vi.fn(),
  publicApiErrorMessage: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : 'Lỗi hệ thống',
  ),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: mocks.requireSession,
  publicApiErrorMessage: mocks.publicApiErrorMessage,
}));

vi.mock('@/lib/playerExperience', () => ({
  completeExperienceSession: mocks.completeExperienceSession,
}));

import { POST } from './route';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/experience/sessions/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/experience/sessions/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue({ userId: 'user-1' });
    mocks.publicApiErrorMessage.mockImplementation((err: unknown) =>
      err instanceof Error ? err.message : 'Lỗi hệ thống',
    );
  });

  it('rejects missing playSessionId with 400 and no service call', async () => {
    const response = await POST(postRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'playSessionId không hợp lệ',
    });
    expect(mocks.completeExperienceSession).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only playSessionId with 400 and no service call', async () => {
    const response = await POST(postRequest({ playSessionId: '   ' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'playSessionId không hợp lệ',
    });
    expect(mocks.completeExperienceSession).not.toHaveBeenCalled();
  });

  it('trims a valid ID, passes authenticated userId, and returns grant/profile result', async () => {
    const result = {
      alreadyGranted: false,
      grant: {
        playSessionId: 'session-1',
        exp: 40,
        answeredCount: 5,
        correctCount: 4,
      },
      profile: {
        totalExp: 40,
        level: 1,
        title: 'Tân binh',
        currentLevelExp: 40,
        nextLevelExp: 50,
        progressRatio: 0.8,
      },
    };
    mocks.completeExperienceSession.mockResolvedValue(result);

    const response = await POST(postRequest({ playSessionId: '  session-1  ' }));

    expect(mocks.requireSession).toHaveBeenCalledOnce();
    expect(mocks.completeExperienceSession).toHaveBeenCalledWith('user-1', 'session-1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, ...result });
  });

  it('preserves a 404 service error', async () => {
    const error = Object.assign(new Error('No score rows found for play session'), {
      status: 404,
    });
    mocks.completeExperienceSession.mockRejectedValue(error);

    const response = await POST(postRequest({ playSessionId: 'missing' }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'No score rows found for play session',
    });
    expect(mocks.publicApiErrorMessage).toHaveBeenCalledWith(error);
  });

  it('preserves a 409 service error', async () => {
    const error = Object.assign(new Error('Play session contains mixed course or game rows'), {
      status: 409,
    });
    mocks.completeExperienceSession.mockRejectedValue(error);

    const response = await POST(postRequest({ playSessionId: 'mixed' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Play session contains mixed course or game rows',
    });
    expect(mocks.publicApiErrorMessage).toHaveBeenCalledWith(error);
  });

  it('maps unexpected errors to status 500 and safe fallback message', async () => {
    mocks.completeExperienceSession.mockRejectedValue(new Error('boom'));
    mocks.publicApiErrorMessage.mockReturnValue('Lỗi hệ thống');

    const response = await POST(postRequest({ playSessionId: 'session-1' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Lỗi hệ thống',
    });
  });
});
