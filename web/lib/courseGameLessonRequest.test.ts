import { describe, expect, it } from 'vitest';

import {
  buildRemoveGameLessonRequest,
  buildSaveGameLessonRequest,
  gameLessonEndpoint,
} from './courseGameLessonRequest';

describe('gameLessonEndpoint', () => {
  it('builds the dedicated per-game endpoint URL', () => {
    expect(gameLessonEndpoint('course-1', 'grammar')).toBe(
      '/api/admin/courses/course-1/game-lessons/grammar'
    );
  });
});

describe('buildSaveGameLessonRequest', () => {
  it('sends a PUT with the range payload to the dedicated endpoint', () => {
    const { url, init } = buildSaveGameLessonRequest('course-1', 'grammar', {
      pageStart: 12,
      pageEnd: 18,
    });

    expect(url).toBe('/api/admin/courses/course-1/game-lessons/grammar');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ pageStart: 12, pageEnd: 18 }));
  });
});

describe('buildRemoveGameLessonRequest', () => {
  it('sends a DELETE to the dedicated endpoint without a body', () => {
    const { url, init } = buildRemoveGameLessonRequest('course-1', 'grammar');

    expect(url).toBe('/api/admin/courses/course-1/game-lessons/grammar');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});
