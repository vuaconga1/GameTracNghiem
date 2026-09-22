import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { GAME_CATALOG, resolveEnabledGameKeys } from '@/lib/gameCatalog';
import {
  SKILL_CATALOG,
  resolveEnabledSkillIds,
  resolveGameSkillsMap,
  skillsForGame,
  type SkillId,
} from '@/lib/skillCatalog';
import { sortCoursesByLevelAndName } from '@/lib/sortCourses';
import { prisma } from '@/lib/db';

/**
 * Catalog for homework picker: levels → units → skills → games.
 */
export async function GET() {
  try {
    await requireAdminOrTeacher();

    const [levels, courses] = await Promise.all([
      prisma.classLevel.findMany({
        where: { ...notArchived, active: true },
        select: { id: true, levelName: true },
        orderBy: { levelName: 'asc' },
      }),
      prisma.course.findMany({
        where: { ...notArchived, active: true },
        select: {
          id: true,
          name: true,
          levelName: true,
          enabledGames: true,
          enabledSkills: true,
          gameSkills: true,
        },
      }),
    ]);

    const sorted = sortCoursesByLevelAndName(courses);

    const items = levels.map((level) => {
      const levelCourses = sorted.filter((c) => c.levelName === level.levelName);
      return {
        levelName: level.levelName,
        courses: levelCourses.map((course) => {
          const enabledSkills = resolveEnabledSkillIds(course.enabledSkills);
          const gameSkills = resolveGameSkillsMap(course.gameSkills, course.enabledGames);
          const enabledGames = resolveEnabledGameKeys(course.enabledGames);

          const skills = enabledSkills.map((skillId) => {
            const skillMeta = SKILL_CATALOG.find((s) => s.id === skillId);
            const games = GAME_CATALOG.filter((game) => {
              if (!enabledGames.includes(game.key) || !game.live) return false;
              const assigned = skillsForGame(gameSkills[game.key]);
              return assigned.includes(skillId as SkillId);
            }).map((game) => ({
              key: game.key,
              label: game.label,
              slug: game.slug,
            }));

            return {
              id: skillId,
              label: skillMeta?.label || skillId,
              shortLabel: skillMeta?.shortLabel || skillId,
              games,
            };
          });

          // Games not assigned to any enabled skill still appear under "Khác"
          const assignedKeys = new Set(
            skills.flatMap((skill) => skill.games.map((g) => g.key))
          );
          const orphanGames = GAME_CATALOG.filter(
            (game) =>
              enabledGames.includes(game.key) &&
              game.live &&
              !assignedKeys.has(game.key)
          ).map((game) => ({
            key: game.key,
            label: game.label,
            slug: game.slug,
          }));

          return {
            id: course.id,
            name: course.name,
            levelName: course.levelName,
            skills,
            orphanGames,
          };
        }),
      };
    });

    return Response.json({ success: true, items });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
