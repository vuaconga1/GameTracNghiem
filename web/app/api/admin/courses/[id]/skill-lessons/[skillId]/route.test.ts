import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  courseFindFirst: vi.fn(),
  ebookFindFirst: vi.fn(),
  skillLessonUpsert: vi.fn(),
  skillLessonDeleteMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    course: { findFirst: mocks.courseFindFirst },
    ebook: { findFirst: mocks.ebookFindFirst },
    courseSkillLesson: {
      upsert: mocks.skillLessonUpsert,
      deleteMany: mocks.skillLessonDeleteMany,
    },
  },
}));

import { DELETE, PUT } from './route';

function context(id = 'course-1', skillId = 'listening') {
  return { params: Promise.resolve({ id, skillId }) };
}

function putRequest(body: unknown) {
  return new Request('http://localhost/api/admin/courses/course-1/skill-lessons/listening', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('administrator course skill lesson route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
  });

  it('requires administrator access', async () => {
    const error = Object.assign(new Error('Không có quyền truy cập'), { status: 403 });
    mocks.requireAdmin.mockRejectedValue(error);

    const response = await PUT(putRequest({ pageStart: 1, pageEnd: 1 }), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Không có quyền truy cập',
    });
    expect(mocks.courseFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a non-canonical skill id', async () => {
    const response = await PUT(
      putRequest({ pageStart: 1, pageEnd: 1 }),
      context('course-1', 'unknown-skill')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.courseFindFirst).not.toHaveBeenCalled();
  });

  it('rejects an invalid page range', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', ebookFileId: 'ebook-1' });
    mocks.ebookFindFirst.mockResolvedValue({ id: 'ebook-1', pageCount: 10 });

    const response = await PUT(putRequest({ pageStart: 8, pageEnd: 3 }), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Trang kết thúc phải lớn hơn hoặc bằng trang bắt đầu.',
    });
    expect(mocks.skillLessonUpsert).not.toHaveBeenCalled();
  });

  it('rejects a course without a selected ebook', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', ebookFileId: null });

    const response = await PUT(putRequest({ pageStart: 1, pageEnd: 1 }), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.ebookFindFirst).not.toHaveBeenCalled();
  });

  it('upserts a valid skill lesson range', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', ebookFileId: 'ebook-1' });
    mocks.ebookFindFirst.mockResolvedValue({ id: 'ebook-1', pageCount: 10 });
    mocks.skillLessonUpsert.mockResolvedValue({
      id: 'lesson-1',
      courseId: 'course-1',
      skillId: 'listening',
      pageStart: 1,
      pageEnd: 1,
    });

    const response = await PUT(putRequest({ pageStart: 1, pageEnd: 1 }), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      item: {
        id: 'lesson-1',
        courseId: 'course-1',
        skillId: 'listening',
        pageStart: 1,
        pageEnd: 1,
      },
    });
    expect(mocks.skillLessonUpsert).toHaveBeenCalledWith({
      where: { courseId_skillId: { courseId: 'course-1', skillId: 'listening' } },
      update: { pageStart: 1, pageEnd: 1 },
      create: {
        courseId: 'course-1',
        skillId: 'listening',
        pageStart: 1,
        pageEnd: 1,
      },
    });
  });

  it('deletes a skill lesson mapping', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1' });
    mocks.skillLessonDeleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(
      new Request('http://localhost/api/admin/courses/course-1/skill-lessons/listening', {
        method: 'DELETE',
      }),
      context()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.skillLessonDeleteMany).toHaveBeenCalledWith({
      where: { courseId: 'course-1', skillId: 'listening' },
    });
  });
});
