import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateSessionExperience,
  experienceToNextLevel,
  profileFromTotalExp,
} from './experience';

const mocks = vi.hoisted(() => ({
  playerExperienceFindUnique: vi.fn(),
  scoreLogFindMany: vi.fn(),
  experienceGrantFindUnique: vi.fn(),
  experienceGrantCreate: vi.fn(),
  playerExperienceUpsert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    playerExperience: {
      findUnique: mocks.playerExperienceFindUnique,
    },
    scoreLog: {
      findMany: mocks.scoreLogFindMany,
    },
    experienceGrant: {
      findUnique: mocks.experienceGrantFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

import { completeExperienceSession, getExperienceProfile } from './playerExperience';

const userId = 'user-1';
const playSessionId = 'session-1';

function scoreRows(
  rows: Array<{ course?: string; game?: string; isCorrect: boolean; elapsedMs: number }>,
) {
  return rows.map((row) => ({
    course: row.course ?? 'Unit 1',
    game: row.game ?? 'grammar',
    isCorrect: row.isCorrect,
    elapsedMs: row.elapsedMs,
  }));
}

describe('getExperienceProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero-EXP level-1 profile when no storage row exists and does not write', async () => {
    mocks.playerExperienceFindUnique.mockResolvedValue(null);

    await expect(getExperienceProfile(userId)).resolves.toEqual(profileFromTotalExp(0));

    expect(mocks.playerExperienceFindUnique).toHaveBeenCalledWith({
      where: { userId },
      select: { totalExp: true },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.playerExperienceUpsert).not.toHaveBeenCalled();
  });

  it('returns profile derived from stored totalExp', async () => {
    mocks.playerExperienceFindUnique.mockResolvedValue({ totalExp: 80 });

    await expect(getExperienceProfile(userId)).resolves.toEqual(profileFromTotalExp(80));
  });
});

describe('completeExperienceSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws status 404 when there are no score rows', async () => {
    mocks.scoreLogFindMany.mockResolvedValue([]);

    await expect(completeExperienceSession(userId, playSessionId)).rejects.toMatchObject({
      status: 404,
    });

    expect(mocks.scoreLogFindMany).toHaveBeenCalledWith({
      where: { userId, playSessionId },
      select: { course: true, game: true, isCorrect: true, elapsedMs: true },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('throws status 409 for mixed course or game and does not transact', async () => {
    mocks.scoreLogFindMany.mockResolvedValue(
      scoreRows([
        { course: 'Unit 1', game: 'grammar', isCorrect: true, elapsedMs: 1000 },
        { course: 'Unit 2', game: 'grammar', isCorrect: false, elapsedMs: 2000 },
      ]),
    );

    await expect(completeExperienceSession(userId, playSessionId)).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.experienceGrantFindUnique).not.toHaveBeenCalled();

    mocks.scoreLogFindMany.mockResolvedValue(
      scoreRows([
        { course: 'Unit 1', game: 'grammar', isCorrect: true, elapsedMs: 1000 },
        { course: 'Unit 1', game: 'quiz', isCorrect: true, elapsedMs: 1000 },
      ]),
    );

    await expect(completeExperienceSession(userId, playSessionId)).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns an existing grant idempotently without transaction or increment', async () => {
    const rows = scoreRows([
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
    ]);
    mocks.scoreLogFindMany.mockResolvedValue(rows);
    mocks.experienceGrantFindUnique.mockResolvedValue({
      playSessionId,
      exp: 145,
      answeredCount: 5,
      correctCount: 5,
    });
    mocks.playerExperienceFindUnique.mockResolvedValue({ totalExp: 500 });

    const result = await completeExperienceSession(userId, playSessionId);

    expect(result).toEqual({
      alreadyGranted: true,
      grant: {
        playSessionId,
        exp: 145,
        answeredCount: 5,
        correctCount: 5,
      },
      profile: profileFromTotalExp(500),
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.experienceGrantFindUnique).toHaveBeenCalledWith({
      where: { userId_playSessionId: { userId, playSessionId } },
    });
  });

  it('creates the grant and upserts totalExp in one transaction on first completion', async () => {
    const rows = scoreRows([
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
      { isCorrect: true, elapsedMs: 0 },
    ]);
    const exp = calculateSessionExperience(rows);
    expect(exp).toBe(145);

    mocks.scoreLogFindMany.mockResolvedValue(rows);
    mocks.experienceGrantFindUnique.mockResolvedValue(null);
    mocks.experienceGrantCreate.mockResolvedValue({
      playSessionId,
      exp,
      answeredCount: 5,
      correctCount: 5,
    });
    mocks.playerExperienceUpsert.mockResolvedValue({ totalExp: exp });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        experienceGrant: { create: mocks.experienceGrantCreate },
        playerExperience: { upsert: mocks.playerExperienceUpsert },
      }),
    );

    const result = await completeExperienceSession(userId, playSessionId);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.experienceGrantCreate).toHaveBeenCalledWith({
      data: {
        userId,
        playSessionId,
        course: 'Unit 1',
        game: 'grammar',
        exp: 145,
        answeredCount: 5,
        correctCount: 5,
        averageCorrectSpeed: 1,
      },
    });
    expect(mocks.playerExperienceUpsert).toHaveBeenCalledWith({
      where: { userId },
      create: { userId, totalExp: 145 },
      update: { totalExp: { increment: 145 } },
    });
    expect(result).toEqual({
      alreadyGranted: false,
      grant: {
        playSessionId,
        exp: 145,
        answeredCount: 5,
        correctCount: 5,
      },
      profile: {
        totalExp: 145,
        level: 2,
        tier: 1,
        expInLevel: 145 - experienceToNextLevel(1),
        expToNextLevel: experienceToNextLevel(2),
        progressPercent: expect.any(Number),
      },
    });
    expect(result.profile).toEqual(profileFromTotalExp(145));
  });

  it('reloads the winning grant and profile on a P2002 transaction race', async () => {
    const rows = scoreRows([{ isCorrect: true, elapsedMs: 5000 }]);
    mocks.scoreLogFindMany.mockResolvedValue(rows);
    mocks.experienceGrantFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        playSessionId,
        exp: 99,
        answeredCount: 1,
        correctCount: 1,
      });
    mocks.playerExperienceFindUnique.mockResolvedValue({ totalExp: 99 });
    mocks.transaction.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    const result = await completeExperienceSession(userId, playSessionId);

    expect(result).toEqual({
      alreadyGranted: true,
      grant: {
        playSessionId,
        exp: 99,
        answeredCount: 1,
        correctCount: 1,
      },
      profile: profileFromTotalExp(99),
    });
    expect(mocks.experienceGrantFindUnique).toHaveBeenCalledTimes(2);
  });

  it('re-throws non-P2002 transaction errors', async () => {
    const rows = scoreRows([{ isCorrect: true, elapsedMs: 1000 }]);
    mocks.scoreLogFindMany.mockResolvedValue(rows);
    mocks.experienceGrantFindUnique.mockResolvedValue(null);
    const boom = Object.assign(new Error('db down'), { code: 'P1001' });
    mocks.transaction.mockRejectedValue(boom);

    await expect(completeExperienceSession(userId, playSessionId)).rejects.toBe(boom);
    expect(mocks.experienceGrantFindUnique).toHaveBeenCalledTimes(1);
  });
});
