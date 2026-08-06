import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
const releaseDailyUsage = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));
vi.mock('@/lib/speaking/usage', () => ({
  releaseDailyUsage: (...args: unknown[]) => releaseDailyUsage(...args),
}));

import { POST } from '@/app/api/admin/speaking/usages/[id]/release/route';

describe('POST /api/admin/speaking/usages/:id/release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    releaseDailyUsage.mockResolvedValue({
      usage: { id: 'usage-1', usedCount: 1, limitSnapshot: 2 },
      sessionId: 'session-2',
    });
  });

  it('requests one audited decrement instead of resetting the day', async () => {
    const response = await POST(
      new Request(
        'http://localhost/api/admin/speaking/usages/usage-1/release',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Lỗi kỹ thuật' }),
        },
      ),
      { params: Promise.resolve({ id: 'usage-1' }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(releaseDailyUsage).toHaveBeenCalledWith({
      usageId: 'usage-1',
      adminId: 'admin-1',
      reason: 'Lỗi kỹ thuật',
    });
    expect(json.usage.usedCount).toBe(1);
  });
});
