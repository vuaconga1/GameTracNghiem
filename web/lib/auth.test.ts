import { describe, expect, it } from 'vitest';

import { publicApiErrorMessage } from './apiErrors';

describe('publicApiErrorMessage', () => {
  it('maps ScoreLog FK errors to re-login message', () => {
    const err = new Error(
      'Foreign key constraint violated on the constraint: `ScoreLog_userId_fkey`'
    );
    expect(publicApiErrorMessage(err)).toContain('đăng nhập lại');
  });

  it('hides prisma dump messages', () => {
    const err = new Error('Invalid `prisma.scoreLog.create()` invocation in\n...');
    expect(publicApiErrorMessage(err)).toBe('Lỗi hệ thống');
  });
});
