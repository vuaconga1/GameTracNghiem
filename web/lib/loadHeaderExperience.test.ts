import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getExperienceProfile: vi.fn(),
}));

vi.mock('./playerExperience', () => ({
  getExperienceProfile: mocks.getExperienceProfile,
}));

import { loadHeaderExperience } from './loadHeaderExperience';

describe('loadHeaderExperience', () => {
  beforeEach(() => {
    mocks.getExperienceProfile.mockReset();
  });

  it('returns the player level and tier', async () => {
    mocks.getExperienceProfile.mockResolvedValue({
      level: 7,
      tier: 2,
      totalExp: 850,
      currentLevelExp: 50,
      nextLevelExp: 200,
      progressPercent: 25,
    });

    await expect(loadHeaderExperience('user-1')).resolves.toEqual({ level: 7, tier: 2 });
    expect(mocks.getExperienceProfile).toHaveBeenCalledWith('user-1');
  });

  it('falls back to level one when the profile cannot load', async () => {
    mocks.getExperienceProfile.mockRejectedValue(new Error('db unavailable'));

    await expect(loadHeaderExperience('user-1')).resolves.toEqual({ level: 1, tier: 1 });
  });
});
