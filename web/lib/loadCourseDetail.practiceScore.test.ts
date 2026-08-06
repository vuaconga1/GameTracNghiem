import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  optionalSession: vi.fn(),
  courseFindFirst: vi.fn(),
  ebookFindFirst: vi.fn(),
  questionGroupBy: vi.fn(),
  questionFindMany: vi.fn(),
  progressFindMany: vi.fn(),
  scoreAggregate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  optionalSession: (...args: unknown[]) => mocks.optionalSession(...args),
}));
vi.mock('@/lib/lop9Units', () => ({
  resolveCanonicalLop9CourseId: (_db: unknown, courseId: string) =>
    Promise.resolve(courseId),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    course: { findFirst: mocks.courseFindFirst },
    ebook: { findFirst: mocks.ebookFindFirst },
    question: {
      groupBy: mocks.questionGroupBy,
      findMany: mocks.questionFindMany,
    },
    gameProgress: { findMany: mocks.progressFindMany },
    scoreLog: { aggregate: mocks.scoreAggregate },
  },
}));

import { loadCourseDetail } from '@/lib/loadCourseDetail';

describe('course detail official score total', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.optionalSession.mockResolvedValue({ userId: 'student-1' });
    mocks.courseFindFirst.mockResolvedValue({
      id: 'course-1',
      name: 'Unit 1',
      levelName: 'Lớp 8',
      enabledGames: ['quiz'],
      gameSkills: null,
      enabledSkills: [],
      ebookFileId: null,
      ebookPageStart: null,
      ebookPageEnd: null,
      skillLessons: [],
    });
    mocks.questionGroupBy.mockResolvedValue([]);
    mocks.questionFindMany.mockResolvedValue([]);
    mocks.progressFindMany.mockResolvedValue([]);
    mocks.scoreAggregate.mockResolvedValue({ _sum: { points: 120 } });
  });

  it('sums only rows that count for the official course total', async () => {
    const result = await loadCourseDetail('course-1');

    expect(result?.totalScore).toBe(120);
    expect(mocks.scoreAggregate).toHaveBeenCalledWith({
      where: {
        userId: 'student-1',
        course: { in: ['Unit 1|Lớp 8', 'Unit 1'] },
        countsForCourseTotal: true,
      },
      _sum: { points: true },
    });
  });
});
