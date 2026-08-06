/**
 * @deprecated Prefer: node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop6-unit.ts --unit 1
 * Thin wrapper kept for older docs/commands.
 */
import { spawnSync } from 'node:child_process';

const extra = process.argv.slice(2);
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', 'scripts/import-lop6-unit.ts', '--unit', '1', ...extra],
  { stdio: 'inherit', cwd: process.cwd(), env: process.env },
);
process.exit(result.status ?? 1);
