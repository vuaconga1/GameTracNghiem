import { describe, expect, it, vi } from 'vitest';

import { submitAnswerScore } from './submitScore';

describe('submitAnswerScore', () => {
  it('scores guests locally without calling the server', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await submitAnswerScore(
      'Unit 1::Lớp 4',
      'grammar',
      0,
      true,
      0,
      'guest-session',
      { kind: 'guest' },
    );

    expect(result).toMatchObject({ success: true, points: 200, isCorrect: true });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
