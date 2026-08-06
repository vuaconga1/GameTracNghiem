import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    speakingEntitlement: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

import { POST } from '@/app/api/admin/speaking/entitlements/[id]/revoke/route';

describe('POST /api/admin/speaking/entitlements/:id/revoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({
      userId: 'admin-1',
      role: 'admin',
    });
    findUnique.mockResolvedValue({ id: 'grant-1', status: 'ACTIVE' });
    update.mockResolvedValue({ id: 'grant-1', status: 'REVOKED' });
  });

  it('records revoker, timestamp, and reason', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/speaking/entitlements/grant-1/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Kết thúc pilot' }),
      }),
      { params: Promise.resolve({ id: 'grant-1' }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'grant-1' },
      data: {
        status: 'REVOKED',
        revokedAt: expect.any(Date),
        revokedById: 'admin-1',
        revocationNote: 'Kết thúc pilot',
      },
    });
  });
});
