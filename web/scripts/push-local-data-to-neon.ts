/**
 * Push data from local Postgres (.env.local) → Neon (.env DIRECT_URL).
 *
 * Usage (from web/):
 *   npm run db:push-data:neon
 *
 * Important: clean dump as Binary/UTF-8 via Node — never PowerShell Get-Content/Set-Content
 * (that re-encodes Vietnamese and causes mojibake on Neon).
 */
import { config } from 'dotenv';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
config({ path: resolve(cwd, '.env') });
config({ path: resolve(cwd, '.env.local'), override: true });

const localUrl = process.env.DATABASE_URL;
config({ path: resolve(cwd, '.env'), override: true });
const neonDirect = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!localUrl?.includes('127.0.0.1') && !localUrl?.includes('localhost')) {
  console.error('Expected local DATABASE_URL in .env.local (127.0.0.1 / localhost).');
  process.exit(1);
}
if (!neonDirect || /127\.0\.0\.1|localhost/i.test(neonDirect)) {
  console.error('Expected Neon DIRECT_URL in .env');
  process.exit(1);
}

function findPgBin(name: string) {
  const candidates = [
    `C:\\Program Files\\PostgreSQL\\17\\bin\\${name}.exe`,
    `C:\\Program Files\\PostgreSQL\\16\\bin\\${name}.exe`,
    name,
  ];
  for (const c of candidates) {
    if (c === name || existsSync(c)) return c;
  }
  return name;
}

const pgDump = findPgBin('pg_dump');
const psql = findPgBin('psql');
const dataDir = resolve(cwd, 'scripts/data');
mkdirSync(dataDir, { recursive: true });
// pg_dump on Windows fails on paths with non-ASCII (e.g. "Trắc Nghiệm") — use %TEMP%.
const dumpFile = resolve(process.env.TEMP || process.env.TMP || dataDir, 'wewin-local-to-neon.sql');
const truncateFile = resolve(process.env.TEMP || process.env.TMP || dataDir, 'wewin-truncate-neon.sql');

console.log('1/3 Dumping local data (UTF-8)…');
const dump = spawnSync(
  pgDump,
  [
    localUrl,
    '--data-only',
    '--no-owner',
    '--no-acl',
    '--exclude-table=_prisma_migrations',
    '--encoding=UTF8',
    '-f',
    dumpFile,
  ],
  { encoding: 'utf8', shell: false },
);
if (dump.status !== 0) {
  console.error(dump.stderr || dump.stdout);
  process.exit(dump.status ?? 1);
}

// Strip pg_dump 17 \restrict lines without re-encoding (Buffer/UTF-8 only).
const cleaned = readFileSync(dumpFile)
  .toString('utf8')
  .split(/\r?\n/)
  .filter((line) => !line.startsWith('\\restrict ') && !line.startsWith('\\unrestrict'))
  .join('\n');
writeFileSync(dumpFile, cleaned, { encoding: 'utf8' });

writeFileSync(
  truncateFile,
  `TRUNCATE TABLE
  "ScoreLog",
  "GameProgress",
  "ExperienceGrant",
  "PlayerExperience",
  "Question",
  "CourseSkillLesson",
  "CourseGameLesson",
  "Course",
  "ClassLevel",
  "Ebook",
  "User"
RESTART IDENTITY CASCADE;
`,
  { encoding: 'utf8' },
);

console.log('2/3 Truncating Neon tables…');
const trunc = spawnSync(
  psql,
  [neonDirect, '-v', 'ON_ERROR_STOP=1', '-c', 'SET client_encoding TO UTF8', '-f', truncateFile],
  { encoding: 'utf8', shell: false },
);
if (trunc.status !== 0) {
  console.error(trunc.stderr || trunc.stdout);
  process.exit(trunc.status ?? 1);
}

console.log('3/3 Restoring into Neon (client_encoding=UTF8)…');
const restore = spawnSync(
  psql,
  [
    neonDirect,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    'SET client_encoding TO UTF8',
    '-f',
    dumpFile,
  ],
  { encoding: 'utf8', shell: false, env: { ...process.env, PGCLIENTENCODING: 'UTF8' } },
);
if (restore.status !== 0) {
  console.error(restore.stderr || restore.stdout);
  process.exit(restore.status ?? 1);
}

const counts = spawnSync(
  psql,
  [
    neonDirect,
    '-c',
    'SET client_encoding TO UTF8; SELECT username, "displayName" FROM "User" ORDER BY username;',
  ],
  { encoding: 'utf8', shell: false, env: { ...process.env, PGCLIENTENCODING: 'UTF8' } },
);
console.log(counts.stdout || counts.stderr);
console.log('Done. Refresh Vercel — no redeploy needed.');

try {
  unlinkSync(truncateFile);
  unlinkSync(dumpFile);
} catch {
  /* ignore */
}
