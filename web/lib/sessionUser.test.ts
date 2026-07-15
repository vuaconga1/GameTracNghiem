import { describe, expect, it } from 'vitest';

import { isStaleSessionUser } from './sessionUser';

describe('isStaleSessionUser', () => {
  it('is stale when user is missing', () => {
    expect(isStaleSessionUser(null)).toBe(true);
  });

  it('is stale when user is archived', () => {
    expect(
      isStaleSessionUser({
        id: 'u1',
        username: 'demo',
        displayName: 'Demo',
        role: 'student',
        archivedAt: new Date(),
      })
    ).toBe(true);
  });

  it('is not stale for active user', () => {
    expect(
      isStaleSessionUser({
        id: 'u1',
        username: 'demo',
        displayName: 'Demo',
        role: 'student',
        archivedAt: null,
      })
    ).toBe(false);
  });
});
