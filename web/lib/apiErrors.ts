/** Map Prisma / unknown errors to a safe client message. */
export function publicApiErrorMessage(err: unknown, fallback = 'Lỗi hệ thống'): string {
  if (err instanceof Error) {
    const msg = err.message || '';
    if (msg.includes('Foreign key constraint') || msg.includes('ScoreLog_userId_fkey')) {
      return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
    }
    if (msg.includes('Invalid `') || msg.includes('prisma') || msg.includes('invocation')) {
      return fallback;
    }
    if (msg.length > 180) return fallback;
    return msg || fallback;
  }
  return fallback;
}
