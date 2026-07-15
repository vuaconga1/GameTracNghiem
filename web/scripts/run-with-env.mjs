/**
 * Run a command with env mode: neon (cloud, default) or local.
 *
 * - neon: load `.env` only (Neon)
 * - local: load `.env` then `.env.local` (override)
 *
 * Pre-set process.env keys are not overwritten by Next.js `.env*` files,
 * so neon mode works even when `.env.local` exists on disk.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- next dev --turbopack
 *   node scripts/run-with-env.mjs local -- npx prisma migrate deploy
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const mode = process.argv[2];
const dash = process.argv.indexOf('--');
const cmd = dash >= 0 ? process.argv.slice(dash + 1) : [];

if (!mode || !['local', 'neon'].includes(mode) || cmd.length === 0) {
  console.error(
    'Usage: node scripts/run-with-env.mjs <neon|local> -- <command> [args...]',
  );
  process.exit(1);
}

const cwd = process.cwd();
const envPath = resolve(cwd, '.env');
const localPath = resolve(cwd, '.env.local');

if (existsSync(envPath)) {
  config({ path: envPath, override: true });
}

if (mode === 'local') {
  if (!existsSync(localPath)) {
    console.error('Missing .env.local — copy from .env.example and set local Postgres URL.');
    process.exit(1);
  }
  config({ path: localPath, override: true });
}

process.env.WEWIN_ENV = mode;

const child = spawn(cmd[0], cmd.slice(1), {
  cwd,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
