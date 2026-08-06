import { describe, expect, it } from 'vitest';

import {
  buildSpeakingDriveFileName,
  sanitizeDriveNamePart,
} from '@/lib/speaking/driveFileName';

describe('speaking drive file names', () => {
  it('builds a session-only non-PII name without overwrite collision', () => {
    expect(
      buildSpeakingDriveFileName({
        sessionId: 'cmrypsb040002cgx5yggdlvba',
        ext: 'webm',
      })
    ).toBe('speaking-cmrypsb040002cgx5yggdlvba.webm');
  });

  it('sanitizes illegal path characters', () => {
    expect(sanitizeDriveNamePart('a/b:c*d?')).toBe('a_b_c_d_');
  });

  it('keeps sessions distinct without embedding names or usernames', () => {
    const a = buildSpeakingDriveFileName({
      sessionId: 'sessA',
    });
    const b = buildSpeakingDriveFileName({
      sessionId: 'sessB',
    });
    expect(a).not.toBe(b);
    expect(a).toBe('speaking-sessA.webm');
    expect(b).toBe('speaking-sessB.webm');
    expect(`${a}${b}`).not.toMatch(/Nguyen|hs1|hs2/);
  });
});
