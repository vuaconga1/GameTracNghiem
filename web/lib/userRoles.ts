import { isLogisticsLevel } from '@/lib/logisticsUnits';

/** Stored in DB / JWT after normalization. Legacy `student` maps to WewinStudent. */
export type UserRole = 'admin' | 'WewinStudent' | 'LogisticsStudent';

export const USER_ROLES: UserRole[] = ['admin', 'WewinStudent', 'LogisticsStudent'];

export function normalizeUserRole(value: unknown): UserRole {
  if (value === 'admin') return 'admin';
  if (value === 'LogisticsStudent') return 'LogisticsStudent';
  if (value === 'WewinStudent') return 'WewinStudent';
  return 'WewinStudent';
}

export function parseUserRoleInput(value: unknown): UserRole | null {
  const raw = String(value || '').trim();
  if (raw === 'admin') return 'admin';
  if (raw === 'LogisticsStudent') return 'LogisticsStudent';
  if (raw === 'WewinStudent' || raw === 'student') return 'WewinStudent';
  return null;
}

export function homeHrefForRole(role: UserRole): string {
  if (role === 'LogisticsStudent') return '/logistics';
  return '/';
}

export function canAccessCourseLevel(role: UserRole, levelName: string): boolean {
  if (role === 'admin') return true;
  if (isLogisticsLevel(levelName)) return role === 'LogisticsStudent';
  return role === 'WewinStudent';
}

export function filterLevelsForRole(role: UserRole, levels: string[]): string[] {
  if (role === 'admin') return levels;
  if (role === 'LogisticsStudent') return levels.filter((level) => isLogisticsLevel(level));
  return levels.filter((level) => !isLogisticsLevel(level));
}

export function isWewinStudentRole(role: unknown): boolean {
  return normalizeUserRole(role) === 'WewinStudent';
}

export function isAdminUserRole(role: unknown): boolean {
  return role === 'admin';
}
