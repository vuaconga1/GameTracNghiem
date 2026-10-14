/** Anonymous browser id for guest access reports. Safe to import from middleware. */
export const GUEST_VISITOR_COOKIE = 'wewin_guest_id';
export const GUEST_VISITOR_HEADER = 'x-wewin-guest-id';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGuestVisitorId(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function guestVisitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === 'production',
  };
}
