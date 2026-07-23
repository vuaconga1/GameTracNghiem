import { getExperienceProfile } from './playerExperience';

export type HeaderExperience = {
  level: number;
  tier: number;
  expInLevel: number;
  expToNextLevel: number | null;
  progressPercent: number;
};

export async function loadHeaderExperience(userId: string): Promise<HeaderExperience> {
  try {
    const profile = await getExperienceProfile(userId);
    return {
      level: profile.level,
      tier: profile.tier,
      expInLevel: profile.expInLevel,
      expToNextLevel: profile.expToNextLevel,
      progressPercent: profile.progressPercent,
    };
  } catch {
    return {
      level: 1,
      tier: 1,
      expInLevel: 0,
      expToNextLevel: 80,
      progressPercent: 0,
    };
  }
}
