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
  it('does not recycle when the current Course, Speaking, and SchoolClass fields are present', () => {
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: {
            Course: { fields: { gameSkills: {}, enabledSkills: {}, enabledGames: {} } },
            User: { fields: { portalLinkedAt: {} } },
            SpeakingActivityConfig: { fields: { activityType: {} } },
            DailySpeakingUsage: { fields: { usedCount: {} } },
            SpeakingSession: { fields: { mustEndAt: {} } },
            SpeakingSessionEndJob: { fields: { dueAt: {} } },
            SpeakingAttempt: { fields: { idempotencyKey: {} } },
            SchoolClass: { fields: { createdByUserId: {} } },
            ClassMember: { fields: { classId: {} } },
            ClassAssignment: { fields: { deadlineAt: {} } },
          },
        },
      })
    ).toBe(false);
  });

  it('does not recycle when runtime fields are Prisma 7 arrays', () => {
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: {
            Course: {
              fields: [
                { name: 'gameSkills' },
                { name: 'enabledSkills' },
                { name: 'enabledGames' },
              ],
            },
            User: { fields: [{ name: 'portalLinkedAt' }] },
            SpeakingActivityConfig: { fields: [{ name: 'activityType' }] },
            DailySpeakingUsage: { fields: [{ name: 'usedCount' }] },
            SpeakingSession: { fields: [{ name: 'mustEndAt' }] },
            SpeakingSessionEndJob: { fields: [{ name: 'dueAt' }] },
            SpeakingAttempt: { fields: [{ name: 'idempotencyKey' }] },
            SchoolClass: { fields: [{ name: 'createdByUserId' }] },
            ClassMember: { fields: [{ name: 'classId' }] },
            ClassAssignment: { fields: [{ name: 'deadlineAt' }] },
          },
        },
      })
    ).toBe(false);
  });

  it('recycles when runtime model is missing skill or SchoolClass fields', () => {
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: { Course: { fields: { enabledGames: {} } } },
        },
      })
    ).toBe(true);
    expect(
      shouldRecycleDevClient({
        _runtimeDataModel: {
          models: {
            Course: { fields: { gameSkills: {}, enabledSkills: {}, enabledGames: {} } },
            User: { fields: { portalLinkedAt: {} } },
            SpeakingActivityConfig: { fields: { activityType: {} } },
            DailySpeakingUsage: { fields: { usedCount: {} } },
            SpeakingSession: { fields: { mustEndAt: {} } },
            SpeakingSessionEndJob: { fields: { dueAt: {} } },
            SpeakingAttempt: { fields: { idempotencyKey: {} } },
          },
        },
      })
    ).toBe(true);
    expect(shouldRecycleDevClient({ _runtimeDataModel: { models: {} } })).toBe(true);
    expect(shouldRecycleDevClient({})).toBe(true);
  });
});
