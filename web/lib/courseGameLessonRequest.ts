import type { CourseGameLessonRange } from './courseGameLesson';

export function gameLessonEndpoint(courseId: string, gameKey: string): string {
  return `/api/admin/courses/${courseId}/game-lessons/${gameKey}`;
}

export function buildSaveGameLessonRequest(
  courseId: string,
  gameKey: string,
  range: CourseGameLessonRange
): { url: string; init: RequestInit } {
  return {
    url: gameLessonEndpoint(courseId, gameKey),
    init: {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(range),
    },
  };
}

export function buildRemoveGameLessonRequest(
  courseId: string,
  gameKey: string
): { url: string; init: RequestInit } {
  return {
    url: gameLessonEndpoint(courseId, gameKey),
    init: { method: 'DELETE' },
  };
}
