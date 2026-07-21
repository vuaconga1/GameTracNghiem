import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  completeExperienceSession: vi.fn(),
  newPlaySessionId: vi.fn(() => 'generated-session'),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: mocks.requireSession,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    gameProgress: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

vi.mock('@/lib/playerExperience', () => ({
  completeExperienceSession: mocks.completeExperienceSession,
}));

vi.mock('@/lib/playSession', () => ({
  newPlaySessionId: mocks.newPlaySessionId,
}));

import { POST } from './route';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/progress', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/progress experience hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue({ userId: 'user-1' });
    mocks.completeExperienceSession.mockResolvedValue({ alreadyGranted: false });
    mocks.newPlaySessionId.mockReturnValue('generated-session');
  });

  it('rejects auth failure with 401 and does not complete', async () => {
    const error = Object.assign(new Error('Chưa đăng nhập'), { status: 401 });
    mocks.requireSession.mockRejectedValue(error);

    const response = await POST(
      postRequest({
        courseKey: 'Course A',
        game: 'grammar',
        statuses: ['correct'],
        playSessionId: 'session-1',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.completeExperienceSession).not.toHaveBeenCalled();
  });

  it('rejects invalid body with 400 and does not complete', async () => {
    const response = await POST(postRequest({ courseKey: 'Course A', game: 'grammar' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Dữ liệu không hợp lệ',
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.completeExperienceSession).not.toHaveBeenCalled();
  });

  it('upserts without completing when non-reset statuses still have empty', async () => {
    mocks.findUnique.mockResolvedValue({
      statuses: ['correct', 'empty'],
      playSessionId: 'session-1',
    });
    mocks.upsert.mockResolvedValue({
      statuses: ['correct', 'empty'],
      playSessionId: 'session-1',
    });

    const response = await POST(
      postRequest({
        courseKey: 'Course A',
        game: 'grammar',
        statuses: ['empty', 'empty'],
        playSessionId: 'session-1',
        reset: false,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledOnce();
    expect(mocks.completeExperienceSession).not.toHaveBeenCalled();
  });

  it('completes the current session once when non-reset statuses are fully graded', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.upsert.mockResolvedValue({
      statuses: ['correct', 'wrong'],
      playSessionId: 'session-1',
    });

    const response = await POST(
      postRequest({
        courseKey: 'Course A',
        game: 'grammar',
        statuses: ['correct', 'wrong'],
        playSessionId: 'session-1',
        reset: false,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      statuses: ['correct', 'wrong'],
      playSessionId: 'session-1',
    });
    expect(mocks.completeExperienceSession).toHaveBeenCalledOnce();
    expect(mocks.completeExperienceSession).toHaveBeenCalledWith('user-1', 'session-1');
  });

  it('on reset completes the previous session then upserts the new one without completing the new id', async () => {
    mocks.findUnique.mockResolvedValue({
      statuses: ['correct', 'wrong'],
      playSessionId: 'old-session',
    });
    mocks.upsert.mockResolvedValue({
      statuses: ['empty', 'empty'],
      playSessionId: 'new-session',
    });

    const response = await POST(
      postRequest({
        courseKey: 'Course A',
        game: 'grammar',
        statuses: ['empty', 'empty'],
        playSessionId: 'new-session',
        reset: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.completeExperienceSession).toHaveBeenCalledOnce();
    expect(mocks.completeExperienceSession).toHaveBeenCalledWith('user-1', 'old-session');
    expect(mocks.upsert).toHaveBeenCalledOnce();
    const completeOrder = mocks.completeExperienceSession.mock.invocationCallOrder[0];
    const upsertOrder = mocks.upsert.mock.invocationCallOrder[0];
    expect(completeOrder).toBeLessThan(upsertOrder);
  });

  it('still returns 200 when complete throws status 404', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.upsert.mockResolvedValue({
      statuses: ['correct'],
      playSessionId: 'session-1',
    });
    mocks.completeExperienceSession.mockRejectedValue(
      Object.assign(new Error('No score rows'), { status: 404 }),
    );

    const response = await POST(
      postRequest({
        courseKey: 'Course A',
        game: 'grammar',
        statuses: ['correct'],
        playSessionId: 'session-1',
        reset: false,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      statuses: ['correct'],
      playSessionId: 'session-1',
    });
    expect(mocks.completeExperienceSession).toHaveBeenCalledWith('user-1', 'session-1');
  });

  it('completes when merged statuses become fully graded from partial existing + incoming', async () => {
    mocks.findUnique.mockResolvedValue({
      statuses: ['correct', 'empty'],
      playSessionId: 'session-1',
    });
    mocks.upsert.mockImplementation(async ({ update }) => ({
      statuses: update.statuses,
      playSessionId: update.playSessionId,
    }));

    const response = await POST(
      postRequest({
        courseKey: 'Course A',
        game: 'grammar',
        statuses: ['empty', 'wrong'],
        playSessionId: 'session-1',
        reset: false,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      statuses: ['correct', 'wrong'],
      playSessionId: 'session-1',
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          statuses: ['correct', 'wrong'],
        }),
      }),
    );
    expect(mocks.completeExperienceSession).toHaveBeenCalledOnce();
    expect(mocks.completeExperienceSession).toHaveBeenCalledWith('user-1', 'session-1');
  });
});
