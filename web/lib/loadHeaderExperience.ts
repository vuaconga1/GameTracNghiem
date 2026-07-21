import { getExperienceProfile } from './playerExperience';

export type HeaderExperience = {
  level: number;
  tier: number;
};

export async function loadHeaderExperience(userId: string): Promise<HeaderExperience> {
  try {
    const profile = await getExperienceProfile(userId);
    return { level: profile.level, tier: profile.tier };
  } catch {
    return { level: 1, tier: 1 };
  }
}
