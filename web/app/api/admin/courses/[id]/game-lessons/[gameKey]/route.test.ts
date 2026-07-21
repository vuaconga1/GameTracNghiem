import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  courseFindFirst: vi.fn(),
  ebookFindFirst: vi.fn(),
  questionGroupBy: vi.fn(),
  gameLessonUpsert: vi.fn(),
  gameLessonDeleteMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    course: { findFirst: mocks.courseFindFirst },
    ebook: { findFirst: mocks.ebookFindFirst },
    question: { groupBy: mocks.questionGroupBy },
    courseGameLesson: {
      upsert: mocks.gameLessonUpsert,
      deleteMany: mocks.gameLessonDeleteMany,
    },
  },
}));

import { GET as getCourse } from '../../route';
import { DELETE, PUT } from './route';

function context(id = 'course-1', gameKey = 'grammar') {
  return { params: Promise.resolve({ id, gameKey }) };
}

function putRequest(body: unknown) {
  return new Request('http://localhost/api/admin/courses/course-1/game-lessons/grammar', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('administrator course game lesson route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
  });

  it('requires administrator access', async () => {
    const error = Object.assign(new Error('Không có quyền truy cập'), { status: 403 });
    mocks.requireAdmin.mockRejectedValue(error);

    const response = await PUT(putRequest({ pageStart: 1, pageEnd: 2 }), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Không có quyền truy cập',
    });
    expect(mocks.courseFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a non-canonical game key', async () => {
    const response = await PUT(
      putRequest({ pageStart: 1, pageEnd: 2 }),
      context('course-1', 'unknown-game'),
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
    expect(mocks.gameLessonUpsert).not.toHaveBeenCalled();
  });

  it('rejects a course without a selected ebook', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', ebookFileId: null });

    const response = await PUT(putRequest({ pageStart: 1, pageEnd: 2 }), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.ebookFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing or inactive ebook', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', ebookFileId: 'ebook-1' });
    mocks.ebookFindFirst.mockResolvedValue(null);

    const response = await PUT(putRequest({ pageStart: 1, pageEnd: 2 }), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.ebookFindFirst).toHaveBeenCalledWith({
      where: { id: 'ebook-1', active: true, archivedAt: null },
      select: { id: true, pageCount: true },
    });
    expect(mocks.gameLessonUpsert).not.toHaveBeenCalled();
  });

  it('upserts one mapping for the course and canonical game key', async () => {
    const item = {
      id: 'mapping-1',
      courseId: 'course-1',
      gameKey: 'grammar',
      pageStart: 2,
      pageEnd: 5,
    };
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', ebookFileId: 'ebook-1' });
    mocks.ebookFindFirst.mockResolvedValue({ id: 'ebook-1', pageCount: 10 });
    mocks.gameLessonUpsert.mockResolvedValue(item);

    const response = await PUT(putRequest({ pageStart: '2', pageEnd: '5' }), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, item });
    expect(mocks.gameLessonUpsert).toHaveBeenCalledWith({
      where: { courseId_gameKey: { courseId: 'course-1', gameKey: 'grammar' } },
      update: { pageStart: 2, pageEnd: 5 },
      create: {
        courseId: 'course-1',
        gameKey: 'grammar',
        pageStart: 2,
        pageEnd: 5,
      },
    });
  });

  it('deletes a mapping idempotently', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1' });
    mocks.gameLessonDeleteMany.mockResolvedValue({ count: 0 });

    const response = await DELETE(
      new Request('http://localhost/api/admin/courses/course-1/game-lessons/grammar', {
        method: 'DELETE',
      }),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.gameLessonDeleteMany).toHaveBeenCalledWith({
      where: { courseId: 'course-1', gameKey: 'grammar' },
    });
  });

  it('returns ordered mappings without changing game counts or visibility metadata', async () => {
    const gameLessons = [
      { gameKey: 'grammar', pageStart: 2, pageEnd: 5 },
      { gameKey: 'quiz', pageStart: 6, pageEnd: 9 },
    ];
    mocks.courseFindFirst.mockResolvedValue({
      id: 'course-1',
      enabledGames: ['grammar'],
      gameLessons,
    });
    mocks.questionGroupBy.mockResolvedValue([
      { game: 'grammar', _count: { _all: 4 } },
    ]);

    const response = await getCourse(
      new Request('http://localhost/api/admin/courses/course-1'),
      { params: Promise.resolve({ id: 'course-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.course.gameLessons).toEqual(gameLessons);
    expect(body.games.find((game: { key: string }) => game.key === 'grammar')).toMatchObject({
      key: 'grammar',
      live: true,
      questionCount: 4,
    });
    expect(mocks.courseFindFirst).toHaveBeenCalledWith({
      where: { id: 'course-1', archivedAt: null },
      include: { gameLessons: { orderBy: { gameKey: 'asc' } } },
    });
  });
});
