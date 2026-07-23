import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock('./db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

vi.mock('./auth', () => ({
  hashPassword: vi.fn(async (plain: string) => `hash:${plain}`),
}));

describe('portalSso', () => {
  beforeEach(() => {
    process.env.PORTAL_SSO_SECRET = 'test-portal-sso-secret-32chars!!';
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('seals and verifies a short-lived token', async () => {
    const { sealPortalSsoToken, verifyPortalSsoToken } = await import('./portalSso');
    const token = await sealPortalSsoToken({
      sid: 'WeWIN01-HV-1602',
      name: 'Lê Quang Khôi',
      pwd: '123',
    });
    const claims = await verifyPortalSsoToken(token);
    expect(claims).toEqual({
      sid: 'WeWIN01-HV-1602',
      name: 'Lê Quang Khôi',
      pwd: '123',
    });
  });

  it('rejects forged or garbage tokens', async () => {
    const { verifyPortalSsoToken } = await import('./portalSso');
    expect(await verifyPortalSsoToken('not.a.jwt')).toBeNull();
    expect(await verifyPortalSsoToken('')).toBeNull();
  });

  it('creates a new student on first SSO', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: 'u1',
      username: 'WeWIN01-HV-1602',
      displayName: 'Lê Quang Khôi',
      role: 'student',
    });

    const { upsertPortalStudent } = await import('./portalSso');
    const session = await upsertPortalStudent({
      sid: 'WeWIN01-HV-1602',
      name: 'Lê Quang Khôi',
      pwd: '123',
    });

    expect(create).toHaveBeenCalled();
    expect(session).toMatchObject({
      userId: 'u1',
      username: 'WeWIN01-HV-1602',
      displayName: 'Lê Quang Khôi',
      role: 'student',
    });
  });

  it('updates existing student name/password', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      username: 'WeWIN01-HV-1602',
      displayName: 'Old',
      role: 'student',
      archivedAt: null,
    });
    update.mockResolvedValue({
      id: 'u1',
      username: 'WeWIN01-HV-1602',
      displayName: 'Lê Quang Khôi',
      role: 'student',
    });

    const { upsertPortalStudent } = await import('./portalSso');
    await upsertPortalStudent({
      sid: 'WeWIN01-HV-1602',
      name: 'Lê Quang Khôi',
      pwd: '123',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          displayName: 'Lê Quang Khôi',
          passwordHash: 'hash:123',
        }),
      })
    );
  });

  it('refuses SSO into admin username', async () => {
    findUnique.mockResolvedValue({
      id: 'a1',
      username: 'admin',
      role: 'admin',
      archivedAt: null,
    });

    const { upsertPortalStudent } = await import('./portalSso');
    await expect(
      upsertPortalStudent({ sid: 'admin', name: 'Admin', pwd: '123' })
    ).rejects.toMatchObject({ status: 403 });
  });
});
