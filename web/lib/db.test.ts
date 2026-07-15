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
  it('does not recycle when Course.enabledGames is present', () => {
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: { Course: { fields: { enabledGames: {} } } },
        },
      })
    ).toBe(false);
  });

  it('recycles only when runtime model is missing the field', () => {
    expect(shouldRecycleDevClient({ _runtimeDataModel: { models: {} } })).toBe(true);
    expect(shouldRecycleDevClient({})).toBe(true);
  });
});
