import { describe, expect, it } from 'vitest';

import {
  hydrateGamePlayerState,
  persistGuestGameProgress,
  readGuestGameState,
  submitGuestAnswerScore,
} from './guestPlayerAdapter';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('guestPlayerAdapter', () => {
  it('hydrates guest progress from browser storage while preserving server state for students', () => {
    const storage = new MemoryStorage();
    persistGuestGameProgress({
      courseKey: 'Unit 1::Lớp 4',
      game: 'grammar',
      statuses: ['correct', 'empty'],
      playSessionId: 'guest-session',
      storage,
    });

    expect(
      hydrateGamePlayerState({
        player: { kind: 'guest' },
        courseKey: 'Unit 1::Lớp 4',
        game: 'grammar',
        statuses: ['wrong'],
        storage,
      }),
    ).toMatchObject({
      statuses: ['correct', 'empty'],
      playSessionId: 'guest-session',
    });
    expect(
      hydrateGamePlayerState({
        player: { kind: 'authenticated' },
        courseKey: 'Unit 1::Lớp 4',
        game: 'grammar',
        statuses: ['wrong'],
        playSessionId: 'server-session',
        gameScore: 99,
        storage,
      }),
    ).toEqual({
      statuses: ['wrong'],
      playSessionId: 'server-session',
      gameScore: 99,
    });
  });

  it('keeps guest progress and score entirely in local storage', () => {
    const storage = new MemoryStorage();
    persistGuestGameProgress({
      courseKey: 'Unit 2::Lớp 4',
      game: 'quiz',
      statuses: ['correct', 'empty'],
      playSessionId: 'session-1',
      storage,
    });
    persistGuestGameProgress({
      courseKey: 'Unit 2::Lớp 4',
      game: 'quiz',
      statuses: ['empty', 'wrong'],
      playSessionId: 'session-1',
      storage,
    });
    const score = submitGuestAnswerScore({
      courseKey: 'Unit 2::Lớp 4',
      game: 'quiz',
      isCorrect: true,
      elapsedMs: 0,
      playSessionId: 'session-1',
      storage,
    });

    expect(score.points).toBe(200);
    expect(readGuestGameState('Unit 2::Lớp 4', 'quiz', storage)).toMatchObject({
      statuses: ['correct', 'wrong'],
      playSessionId: 'session-1',
      gameScore: 200,
      totalScore: 200,
    });
  });
});
