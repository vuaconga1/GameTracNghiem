import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Next.js loads `.env` then `.env.local` (local wins).
 * Prisma CLI / tsx scripts only use dotenv — mirror that same order here.
 *
 * Set WEWIN_ENV=neon to skip `.env.local` and use `.env` (Neon) only.
 */
export function loadEnv(cwd = process.cwd()) {
  const envPath = resolve(cwd, '.env');
  const localPath = resolve(cwd, '.env.local');

  if (existsSync(envPath)) {
    config({ path: envPath });
  }

  const useNeon = process.env.WEWIN_ENV === 'neon';
  if (!useNeon && existsSync(localPath)) {
    config({ path: localPath, override: true });
  }
}

loadEnv();
