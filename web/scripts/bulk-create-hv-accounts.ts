/**
 * Bulk-create WewinStudent accounts from E:\Active\_extract_students.txt
 * (lines: "Mã HV | Họ tên").
 *
 * Username = mã HV (casing preserved from file, typically WeWIN01-HV-…).
 * Default password = username (mã HV). Existing students are skipped
 * (matched case-insensitively); displayName is refreshed.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/bulk-create-hv-accounts.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/bulk-create-hv-accounts.ts
 *   … -- --dry-run
 *   … -- --password=123123
 */
import '../lib/loadEnv';
import { readFileSync, writeFileSync } from 'node:fs';

import { hashPassword } from '../lib/auth';
import { prisma } from '../lib/db';

const EXTRACT_PATH = process.env.HV_EXTRACT_PATH || 'E:/Active/_extract_students.txt';
const REPORT_PATH = process.env.HV_REPORT_PATH || 'E:/Active/_created_accounts.txt';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const passwordArg = args.find((a) => a.startsWith('--password='));
const passwordMode = passwordArg ? passwordArg.slice('--password='.length) : 'username';

type StudentRow = { username: string; displayName: string };

function parseExtract(filePath: string): StudentRow[] {
  const text = readFileSync(filePath, 'utf8');
  const byKey = new Map<string, StudentRow>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('=') || trimmed.startsWith('(')) {
      continue;
    }
    const sep = trimmed.indexOf('|');
    if (sep < 0) continue;
    const username = trimmed.slice(0, sep).trim();
    const displayName = trimmed.slice(sep + 1).trim();
    if (!username || !displayName) continue;
    if (!/^(WeWIN\d+-(HV|KH)-\d+|WeWIN-HV\d+-\d+)$/i.test(username)) continue;
    const key = username.toUpperCase();
    if (!byKey.has(key)) {
      byKey.set(key, { username, displayName });
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.username.localeCompare(b.username, 'en', { sensitivity: 'base' }),
  );
}

function passwordFor(username: string): string {
  if (passwordMode === 'username') return username;
  return passwordMode;
}

async function main() {
  const students = parseExtract(EXTRACT_PATH);
  console.log(`Parsed ${students.length} unique HV codes from ${EXTRACT_PATH}`);
  if (dryRun) {
    console.log('Dry run — no DB writes. Sample:', students.slice(0, 5));
    return;
  }

  const existing = await prisma.user.findMany({
    where: {
      username: { contains: 'WeWIN', mode: 'insensitive' },
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      archivedAt: true,
    },
  });
  const existingByUpper = new Map(
    existing.map((u) => [u.username.toUpperCase(), u] as const),
  );

  const created: StudentRow[] = [];
  const updated: StudentRow[] = [];
  const skippedAdmin: string[] = [];
  const errors: string[] = [];

  for (const student of students) {
    const key = student.username.toUpperCase();
    const found = existingByUpper.get(key);
    try {
      if (found) {
        if (found.role === 'admin') {
          skippedAdmin.push(found.username);
          continue;
        }
        await prisma.user.update({
          where: { id: found.id },
          data: {
            displayName: student.displayName,
            role: 'WewinStudent',
            archivedAt: null,
            // Keep existing password + portalLinkedAt.
          },
        });
        updated.push(student);
        continue;
      }

      const passwordHash = await hashPassword(passwordFor(student.username));
      await prisma.user.create({
        data: {
          username: student.username,
          displayName: student.displayName,
          passwordHash,
          role: 'WewinStudent',
        },
      });
      created.push(student);
    } catch (err) {
      errors.push(
        `${student.username}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const report = [
    `Bulk HV accounts — ${new Date().toISOString()}`,
    `Source: ${EXTRACT_PATH}`,
    `Password policy: ${passwordMode === 'username' ? 'password = username (mã HV, đúng casing)' : `fixed password`}`,
    `Created: ${created.length}`,
    `Updated displayName (existing): ${updated.length}`,
    `Skipped admin: ${skippedAdmin.length}`,
    `Errors: ${errors.length}`,
    '',
    '--- CREATED (username | displayName | password) ---',
    ...created.map(
      (s) => `${s.username} | ${s.displayName} | ${passwordFor(s.username)}`,
    ),
    '',
    '--- UPDATED ---',
    ...updated.map((s) => `${s.username} | ${s.displayName}`),
    '',
    skippedAdmin.length
      ? `--- SKIPPED ADMIN ---\n${skippedAdmin.join('\n')}`
      : '',
    errors.length ? `--- ERRORS ---\n${errors.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(report.split('\n').slice(0, 12).join('\n'));
  console.log(`Full report: ${REPORT_PATH}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
