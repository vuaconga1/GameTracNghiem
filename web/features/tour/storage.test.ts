import { describe, expect, it, vi } from 'vitest';

import { clearHomeTourDone, isHomeTourDone, markHomeTourDone } from './storage';

describe('home tour storage', () => {
  it('marks and clears done flag in localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });

    clearHomeTourDone();
    expect(isHomeTourDone()).toBe(false);
    markHomeTourDone();
    expect(isHomeTourDone()).toBe(true);
    clearHomeTourDone();
    expect(isHomeTourDone()).toBe(false);

    vi.unstubAllGlobals();
  });
});
