/**
 * CSV import stub for users and courses.
 * Reads local CSV files; Google Sheets API integration is optional later.
 */
import '../lib/loadEnv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import bcrypt from 'bcryptjs';

import { prisma } from '../lib/db';

const DATA_DIR = join(process.cwd(), 'scripts/data');

function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function parseBool(value: string, defaultValue = true): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function readCsv(filename: string): Record<string, string>[] {
  const path = join(DATA_DIR, filename);
  const content = readFileSync(path, 'utf8');
  return parseCsv(content);
}

async function importUsers(rows: Record<string, string>[]) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const username = row.username?.trim();
    const password = row.password?.trim();
    const displayName = row.displayName?.trim();

    if (!username || !password || !displayName) {
      skipped += 1;
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { username } });

    await prisma.user.upsert({
      where: { username },
      update: { passwordHash, displayName },
      create: { username, passwordHash, displayName },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { created, updated, skipped };
}

async function importCourses(rows: Record<string, string>[]) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const levelName = row.levelName?.trim() || row.level?.trim();
    const name = row.name?.trim() || row.course?.trim();
    const active = parseBool(row.active ?? '', true);

    if (!levelName || !name) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.course.findFirst({
      where: { name, levelName },
    });

    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: { active },
      });
      updated += 1;
    } else {
      await prisma.course.create({
        data: { name, levelName, active },
      });
      created += 1;
    }

    await prisma.classLevel.upsert({
      where: { levelName },
      update: { active: true },
      create: { levelName, active: true },
    });
  }

  return { created, updated, skipped };
}

async function main() {
  const userRows = readCsv('users.csv');
  const courseRows = readCsv('courses.csv');

  const users = await importUsers(userRows);
  const courses = await importCourses(courseRows);

  console.log('Import complete');
  console.log(
    `  users: ${users.created} created, ${users.updated} updated, ${users.skipped} skipped`,
  );
  console.log(
    `  courses: ${courses.created} created, ${courses.updated} updated, ${courses.skipped} skipped`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
