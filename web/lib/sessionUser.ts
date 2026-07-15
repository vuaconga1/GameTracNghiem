export type SessionUserRow = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  archivedAt: Date | null;
};

/** True when the JWT user no longer maps to an active DB user. */
export function isStaleSessionUser(user: SessionUserRow | null | undefined): boolean {
  return !user || user.archivedAt != null;
}
