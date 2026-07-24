import { describe, expect, it } from 'vitest';

import {
  buildSpeakingDriveFileName,
  sanitizeDriveNamePart,
} from '@/lib/speaking/driveFileName';

describe('speaking drive file names', () => {
  it('builds username-displayName-sessionId without overwrite collision', () => {
    expect(
      buildSpeakingDriveFileName({
        username: 'admin',
        displayName: 'Quản trị viên',
        sessionId: 'cmrypsb040002cgx5yggdlvba',
        ext: 'webm',
      })
    ).toBe('admin-Quản trị viên-cmrypsb040002cgx5yggdlvba.webm');
  });

  it('sanitizes illegal path characters', () => {
    expect(sanitizeDriveNamePart('a/b:c*d?')).toBe('a_b_c_d_');
  });

  it('keeps two same-display-name students distinct via username+sessionId', () => {
    const a = buildSpeakingDriveFileName({
      username: 'hs1',
      displayName: 'Nguyen Van A',
      sessionId: 'sessA',
    });
    const b = buildSpeakingDriveFileName({
      username: 'hs2',
      displayName: 'Nguyen Van A',
      sessionId: 'sessB',
    });
    expect(a).not.toBe(b);
    expect(a.startsWith('hs1-')).toBe(true);
    expect(b.startsWith('hs2-')).toBe(true);
  });
});
