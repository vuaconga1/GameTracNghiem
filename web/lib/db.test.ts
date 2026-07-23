import { describe, expect, it } from 'vitest';

import { buildPgPoolConfig, shouldRecycleDevClient } from './db';

describe('buildPgPoolConfig', () => {
  it('strips sslmode for neon hosts and sets rejectUnauthorized false', () => {
    const config = buildPgPoolConfig(
      'postgresql://u:p@ep-x.neon.tech/db?sslmode=require'
    );
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(String(config.connectionString)).not.toContain('sslmode=');
  });
});

describe('shouldRecycleDevClient', () => {
  it('does not recycle when Course.gameSkills and enabledSkills are present', () => {
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: {
            Course: { fields: { gameSkills: {}, enabledSkills: {}, enabledGames: {} } },
          },
        },
      })
    ).toBe(false);
  });

  it('recycles when runtime model is missing skill fields', () => {
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: { Course: { fields: { enabledGames: {} } } },
        },
      })
    ).toBe(true);
    expect(shouldRecycleDevClient({ _runtimeDataModel: { models: {} } })).toBe(true);
    expect(shouldRecycleDevClient({})).toBe(true);
  });
});
