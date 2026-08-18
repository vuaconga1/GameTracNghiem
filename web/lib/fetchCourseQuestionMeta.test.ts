import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mocks.queryRaw(...args),
  },
}));

import { fetchCourseQuestionMeta } from '@/lib/fetchCourseQuestionMeta';

describe('fetchCourseQuestionMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list when no games are requested', async () => {
    await expect(fetchCourseQuestionMeta('course-1', [])).resolves.toEqual([]);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it('maps JSON path columns into plain strings', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        game: 'quiz',
        hint: null,
        source: null,
        prefix: null,
        suffix: null,
        exercise: 'Hoàn thành câu',
        exerciseKey: null,
        skill: 'reading',
      },
    ]);

    await expect(fetchCourseQuestionMeta('course-1', ['quiz'])).resolves.toEqual([
      {
        game: 'quiz',
        hint: '',
        source: '',
        prefix: '',
        suffix: '',
        exercise: 'Hoàn thành câu',
        exerciseKey: '',
        skill: 'reading',
      },
    ]);
  });
});
