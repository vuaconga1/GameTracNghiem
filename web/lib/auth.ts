import bcrypt from 'bcryptjs';
import { getSession, type SessionPayload } from './session';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const err = new Error('Chưa đăng nhập') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return session;
}
