import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdminOrTeacher = vi.fn();
const verifyPassword = vi.fn();
const hashPassword = vi.fn();
const userFindFirst = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const setSessionCookie = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdminOrTeacher: (...args: unknown[]) => requireAdminOrTeacher(...args),
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
  hashPassword: (...args: unknown[]) => hashPassword(...args),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => userFindFirst(...args),
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
  },
}));

vi.mock('@/lib/session', () => ({
  setSessionCookie: (...args: unknown[]) => setSessionCookie(...args),
}));

import { PATCH } from '@/app/api/admin/account/route';

const session = {
  userId: 'teacher-1',
  username: 'gv.mai',
  displayName: 'Cô Mai',
  role: 'teacher' as const,
};

function patchBody(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/account', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminOrTeacher.mockResolvedValue(session);
    userFindFirst.mockResolvedValue({
      id: 'teacher-1',
      username: 'gv.mai',
      displayName: 'Cô Mai',
      role: 'teacher',
      passwordHash: 'hash',
    });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue('new-hash');
    userFindUnique.mockResolvedValue(null);
    userUpdate.mockResolvedValue({
      id: 'teacher-1',
      username: 'gv.mai',
      displayName: 'Cô Mai',
      role: 'teacher',
    });
  });

  it('rejects wrong current password', async () => {
    verifyPassword.mockResolvedValue(false);
    const res = await PATCH(
      patchBody({ currentPassword: 'sai', newPassword: 'moi', confirmPassword: 'moi' })
    );
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json).toMatchObject({
      success: false,
      message: 'Mật khẩu hiện tại không đúng',
    });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('updates password only without refreshing session', async () => {
    const res = await PATCH(
      patchBody({
        currentPassword: 'cu',
        newPassword: 'moi123',
        confirmPassword: 'moi123',
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(hashPassword).toHaveBeenCalledWith('moi123');
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'teacher-1' },
        data: { passwordHash: 'new-hash' },
      })
    );
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it('updates username and refreshes session cookie', async () => {
    userUpdate.mockResolvedValue({
      id: 'teacher-1',
      username: 'gv.mai.new',
      displayName: 'Cô Mai',
      role: 'teacher',
    });
    const res = await PATCH(
      patchBody({
        currentPassword: 'cu',
        newUsername: 'gv.mai.new',
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.item.username).toBe('gv.mai.new');
    expect(setSessionCookie).toHaveBeenCalledWith({
      userId: 'teacher-1',
      username: 'gv.mai.new',
      displayName: 'Cô Mai',
      role: 'teacher',
    });
  });

  it('rejects taken username', async () => {
    userFindUnique.mockResolvedValue({ id: 'other-user' });
    const res = await PATCH(
      patchBody({
        currentPassword: 'cu',
        newUsername: 'taken',
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toContain('Username đã được người khác sử dụng');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation', async () => {
    const res = await PATCH(
      patchBody({
        currentPassword: 'cu',
        newPassword: 'moi1',
        confirmPassword: 'moi2',
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toContain('không khớp');
  });
});
