import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getExperienceProfile: vi.fn(),
  publicApiErrorMessage: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : 'Lỗi hệ thống',
  ),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: mocks.requireSession,
  publicApiErrorMessage: mocks.publicApiErrorMessage,
}));

vi.mock('@/lib/playerExperience', () => ({
  getExperienceProfile: mocks.getExperienceProfile,
}));

import { GET } from './route';

describe('GET /api/experience/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue({ userId: 'user-1' });
    mocks.publicApiErrorMessage.mockImplementation((err: unknown) =>
      err instanceof Error ? err.message : 'Lỗi hệ thống',
    );
  });

  it('calls auth then service with authenticated userId and returns profile', async () => {
    const profile = {
      totalExp: 80,
      level: 2,
      title: 'Học viên',
      currentLevelExp: 30,
      nextLevelExp: 100,
      progressRatio: 0.3,
    };
    mocks.getExperienceProfile.mockResolvedValue(profile);

    const response = await GET();

    expect(mocks.requireSession).toHaveBeenCalledOnce();
    expect(mocks.getExperienceProfile).toHaveBeenCalledWith('user-1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, profile });
  });

  it('preserves a 401 auth error', async () => {
    const error = Object.assign(new Error('Chưa đăng nhập'), { status: 401 });
    mocks.requireSession.mockRejectedValue(error);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Chưa đăng nhập',
    });
    expect(mocks.getExperienceProfile).not.toHaveBeenCalled();
    expect(mocks.publicApiErrorMessage).toHaveBeenCalledWith(error);
  });

  it('maps unexpected errors to status 500 and safe fallback message', async () => {
    mocks.getExperienceProfile.mockRejectedValue(new Error('db down'));
    mocks.publicApiErrorMessage.mockReturnValue('Lỗi hệ thống');

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Lỗi hệ thống',
    });
  });
});
