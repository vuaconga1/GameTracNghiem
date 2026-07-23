import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  saveCourseBackground: vi.fn(),
  deleteCourseBackground: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db', () => ({
  prisma: {
    course: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));
vi.mock('@/lib/courseBackgroundStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/courseBackgroundStorage')>();
  return {
    ...actual,
    saveCourseBackground: mocks.saveCourseBackground,
    deleteCourseBackground: mocks.deleteCourseBackground,
  };
});

import { DELETE, PATCH, POST } from './route';

const context = { params: Promise.resolve({ id: 'course-1' }) };

describe('/api/admin/courses/[id]/background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({
      id: 'course-1',
      backgroundImageKey: 'old.webp',
      backgroundImageUrl: null,
    });
  });

  it('uploads a supported image and replaces the previous file', async () => {
    mocks.saveCourseBackground.mockResolvedValue('new.webp');
    mocks.update.mockResolvedValue({
      id: 'course-1',
      backgroundImageKey: 'new.webp',
      backgroundImageUrl: null,
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'unit.webp', { type: 'image/webp' }));

    const response = await POST(
      new Request('http://localhost/api/admin/courses/course-1/background', {
        method: 'POST',
        body: form,
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(mocks.saveCourseBackground).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { backgroundImageKey: 'new.webp', backgroundImageUrl: null },
    });
    expect(mocks.deleteCourseBackground).toHaveBeenCalledWith('old.webp');
  });

  it('rejects an unsafe external URL', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/admin/courses/course-1/background', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'javascript:alert(1)' }),
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('clears both configured image sources', async () => {
    mocks.update.mockResolvedValue({
      id: 'course-1',
      backgroundImageKey: null,
      backgroundImageUrl: null,
    });

    const response = await DELETE(
      new Request('http://localhost/api/admin/courses/course-1/background', {
        method: 'DELETE',
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { backgroundImageUrl: null, backgroundImageKey: null },
    });
    expect(mocks.deleteCourseBackground).toHaveBeenCalledWith('old.webp');
  });
});
