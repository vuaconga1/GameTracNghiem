import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
const userFindMany = vi.fn();
const entitlementFindMany = vi.fn();
const entitlementCreate = vi.fn();
const transaction = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findMany: (...args: unknown[]) => userFindMany(...args) },
    course: { findFirst: vi.fn() },
    speakingEntitlement: {
      findMany: (...args: unknown[]) => entitlementFindMany(...args),
      create: (...args: unknown[]) => entitlementCreate(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import { POST } from '@/app/api/admin/speaking/entitlements/route';

describe('POST /api/admin/speaking/entitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({
      userId: 'admin-1',
      username: 'admin',
      displayName: 'Admin',
      role: 'admin',
    });
    userFindMany.mockResolvedValue([
      { id: 'student-1', username: 'WeWIN01-HV-1602' },
    ]);
    entitlementFindMany.mockResolvedValue([]);
    entitlementCreate.mockResolvedValue({
      id: 'grant-1',
      userId: 'student-1',
      courseId: null,
      status: 'ACTIVE',
      startsAt: new Date('2026-08-05T17:00:00.000Z'),
      expiresAt: new Date('2026-09-05T17:00:00.000Z'),
    });
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it('bulk grants with Vietnam boundaries and creator audit', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/speaking/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: ['WeWIN01-HV-1602'],
          startsOn: '2026-08-06',
          expiresOn: '2026-09-06',
          source: 'PILOT_IMPORT',
          note: 'pilot lớp 8',
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ success: true, granted: 1, missing: [] });
    expect(entitlementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'student-1',
          createdById: 'admin-1',
          startsAt: new Date('2026-08-05T17:00:00.000Z'),
          expiresAt: new Date('2026-09-05T17:00:00.000Z'),
          source: 'PILOT_IMPORT',
          note: 'pilot lớp 8',
        }),
      }),
    );
  });
});
