import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  optionalSession: vi.fn(),
  getCourseDetailPublicCached: vi.fn(),
  progressFindMany: vi.fn(),
  scoreAggregate: vi.fn(),
  resolveCanonicalLop9CourseId: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  optionalSession: (...args: unknown[]) => mocks.optionalSession(...args),
}));
vi.mock('@/lib/lop9Units', () => ({
  resolveCanonicalLop9CourseId: (...args: unknown[]) =>
    mocks.resolveCanonicalLop9CourseId(...args),
}));
vi.mock('@/lib/loadCourseDetailPublic', () => ({
  getCourseDetailPublicCached: (...args: unknown[]) =>
    mocks.getCourseDetailPublicCached(...args),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    gameProgress: { findMany: mocks.progressFindMany },
    scoreLog: { aggregate: mocks.scoreAggregate },
  },
}));

import { loadCourseDetail } from '@/lib/loadCourseDetail';

describe('course detail official score total', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.optionalSession.mockResolvedValue({ userId: 'student-1' });
    mocks.resolveCanonicalLop9CourseId.mockImplementation(
      (_db: unknown, courseId: string) => Promise.resolve(courseId),
    );
    mocks.getCourseDetailPublicCached.mockResolvedValue({
      course: {
        id: 'course-1',
        name: 'Unit 1',
        levelName: 'Lớp 8',
        courseKey: 'Unit 1|Lớp 8',
        enabledGames: ['quiz'],
        gameSkills: { quiz: ['writing'] },
        enabledSkills: ['writing'],
        ebook: null,
        skillLessons: {},
      },
      games: {
        quiz: { questionCount: 10, statuses: [] },
      },
      skillScopedQuestions: { quiz: [{ skill: 'writing' }] },
      skillStats: {
        writing: {
          totalQuestions: 10,
          completedQuestions: 0,
          byGame: { quiz: { questionCount: 10, completedCount: 0 } },
        },
      },
    });
    mocks.progressFindMany.mockResolvedValue([]);
    mocks.scoreAggregate.mockResolvedValue({ _sum: { points: 120 } });
  });

  it('sums only rows that count for the official course total', async () => {
    const result = await loadCourseDetail('course-1');

    expect(result?.totalScore).toBe(120);
    expect(mocks.getCourseDetailPublicCached).toHaveBeenCalledWith('course-1');
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
