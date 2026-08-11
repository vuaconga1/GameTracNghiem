import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireSession = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
const verifyPassword = vi.fn();
const hashPassword = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
  hashPassword: (...args: unknown[]) => hashPassword(...args),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.resetModules();
    requireSession.mockReset();
    findUnique.mockReset();
    update.mockReset();
    verifyPassword.mockReset();
    hashPassword.mockReset();
    requireSession.mockResolvedValue({ userId: 'u1', role: 'student' });
  });

  it('updates password when current password matches', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: 'hash:old',
      archivedAt: null,
    });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue('hash:new');
    update.mockResolvedValue({});

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'old-pass',
          newPassword: 'new-pass',
        }),
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'hash:new' },
    });
  });

  it('rejects wrong current password', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: 'hash:old',
      archivedAt: null,
    });
    verifyPassword.mockResolvedValue(false);

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'wrong',
          newPassword: 'new-pass',
        }),
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
