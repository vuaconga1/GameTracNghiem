import type { CourseSkillLessonRange } from './courseSkillLesson';
import type { SkillId } from './skillCatalog';

export function skillLessonEndpoint(courseId: string, skillId: SkillId): string {
  return `/api/admin/courses/${courseId}/skill-lessons/${skillId}`;
}

export function buildSaveSkillLessonRequest(
  courseId: string,
  skillId: SkillId,
  range: CourseSkillLessonRange
): { url: string; init: RequestInit } {
  return {
    url: skillLessonEndpoint(courseId, skillId),
    init: {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(range),
    },
  };
}

export function buildRemoveSkillLessonRequest(
  courseId: string,
  skillId: SkillId
): { url: string; init: RequestInit } {
  return {
    url: skillLessonEndpoint(courseId, skillId),
    init: { method: 'DELETE' },
  };
}
