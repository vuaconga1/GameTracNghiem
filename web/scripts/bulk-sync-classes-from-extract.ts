/**
 * Create SchoolClass rows + ClassMember links from E:\Active\_extract_students.txt
 *
 * Class name format (per product request):
 *   WW00016 — IELTS INTENSIVE
 * (WW code + program title; teacher names stripped)
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/bulk-sync-classes-from-extract.ts
 *   … -- --dry-run
 */
import '../lib/loadEnv';
import { readFileSync, writeFileSync } from 'node:fs';

import { prisma } from '../lib/db';

const EXTRACT_PATH = process.env.HV_EXTRACT_PATH || 'E:/Active/_extract_students.txt';
const REPORT_PATH = process.env.CLASS_SYNC_REPORT || 'E:/Active/_synced_classes.txt';

const dryRun = process.argv.includes('--dry-run');

type ClassBlock = {
  code: string;
  name: string;
  usernames: string[];
};

function isStudentId(s: string): boolean {
  return /^(WeWIN\d+-(HV|KH)-\d+|WeWIN-HV\d+-\d+)$/i.test(s);
}

/** Strip trailing " - Teacher (+ Teacher2)" from Excel title. */
function stripTeachers(title: string): string {
  const parts = title.split(/\s+-\s+/);
  if (parts.length < 2) return title.trim();
  const last = parts[parts.length - 1];
  const looksLikeTeacher =
    /\+/.test(last) ||
    /^(Ms\.?\s|MS\.?\s|MR\.?\s)/i.test(last) ||
    /^(Hồ |NGUYỄN|ĐẶNG|PHẠM|TRẦN|LÊ |VÕ |UÔNG|BÙI |ĐỖ |LƯƠNG|HUỲNH|HOÀNG|CAO |TĂNG|MAI |VŨ |LÝ |QUÁCH|DIỆP|ESAM)/i.test(
      last,
    );
  if (looksLikeTeacher) {
    return parts.slice(0, -1).join(' - ').trim();
  }
  return title.trim();
}

function parseClassHeader(line: string): { code: string; name: string } | null {
  const bare = line.match(/^##\s*(WW\d+)\s*$/i);
  if (bare) {
    const code = bare[1].toUpperCase();
    return { code, name: code };
  }
  const m = line.match(/^##\s*(WW\d+)\s*[—–-]\s*(.+)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const program = stripTeachers(m[2].trim());
  const name = program ? `${code} — ${program}` : code;
  return { code, name };
}

function parseExtract(filePath: string): ClassBlock[] {
  const text = readFileSync(filePath, 'utf8');
  const blocks: ClassBlock[] = [];
  let current: ClassBlock | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('=') || line.startsWith('Tổng') || line.startsWith('Số ') || line.startsWith('Lớp trống')) {
      continue;
    }
    if (line.startsWith('## ')) {
      const header = parseClassHeader(line);
      if (!header) continue;
      current = { code: header.code, name: header.name, usernames: [] };
      blocks.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('(không có')) continue;
    const sep = line.indexOf('|');
    if (sep < 0) continue;
    const username = line.slice(0, sep).trim();
    if (isStudentId(username)) {
      const key = username.toUpperCase();
      if (!current.usernames.some((u) => u.toUpperCase() === key)) {
        current.usernames.push(username);
      }
    }
  }
  return blocks;
}

async function resolveCreatorUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin', archivedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true },
  });
  if (admin) return admin.id;
  const any = await prisma.user.findFirst({
    where: { archivedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!any) throw new Error('No user available as class creator');
  return any.id;
}

async function findClassByCode(code: string) {
  const exactPrefix = `${code} —`;
  const hits = await prisma.schoolClass.findMany({
    where: {
      OR: [
        { name: code },
        { name: { startsWith: exactPrefix } },
        { name: { startsWith: `${code} -` } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  return hits[0] ?? null;
}

async function main() {
  const blocks = parseExtract(EXTRACT_PATH);
  console.log(`Parsed ${blocks.length} classes from ${EXTRACT_PATH}`);
  if (dryRun) {
    console.log(
      'Sample:',
      blocks.slice(0, 3).map((b) => ({ name: b.name, members: b.usernames.length })),
    );
    return;
  }

  const creatorId = await resolveCreatorUserId();
  const wewinUsers = await prisma.user.findMany({
    where: { username: { contains: 'WeWIN', mode: 'insensitive' }, archivedAt: null },
    select: { id: true, username: true },
  });
  const userIdByUpper = new Map(wewinUsers.map((u) => [u.username.toUpperCase(), u.id]));

  let createdClasses = 0;
  let reusedClasses = 0;
  let renamedClasses = 0;
  let linkedMembers = 0;
  let missingUsers = 0;
  const missingList: string[] = [];
  const lines: string[] = [];

  for (const block of blocks) {
    let schoolClass = await findClassByCode(block.code);
    if (!schoolClass) {
      schoolClass = await prisma.schoolClass.create({
        data: { name: block.name, createdByUserId: creatorId },
        select: { id: true, name: true },
      });
      createdClasses += 1;
      lines.push(`CREATED ${block.name}`);
    } else {
      reusedClasses += 1;
      if (schoolClass.name !== block.name) {
        await prisma.schoolClass.update({
          where: { id: schoolClass.id },
          data: { name: block.name },
        });
        renamedClasses += 1;
        lines.push(`RENAMED ${schoolClass.name} → ${block.name}`);
      } else {
        lines.push(`EXISTS ${block.name}`);
      }
    }

    const memberIds: string[] = [];
    for (const username of block.usernames) {
      const id = userIdByUpper.get(username.toUpperCase());
      if (!id) {
        missingUsers += 1;
        missingList.push(`${block.code}: ${username}`);
        continue;
      }
      memberIds.push(id);
    }

    if (memberIds.length) {
      const result = await prisma.classMember.createMany({
        data: memberIds.map((userId) => ({ classId: schoolClass!.id, userId })),
        skipDuplicates: true,
      });
      linkedMembers += result.count;
      lines.push(`  +${result.count} members (requested ${memberIds.length})`);
    } else {
      lines.push('  (no members)');
    }
  }

  const report = [
    `Class sync — ${new Date().toISOString()}`,
    `Source: ${EXTRACT_PATH}`,
    `Classes parsed: ${blocks.length}`,
    `Created: ${createdClasses}`,
    `Reused: ${reusedClasses}`,
    `Renamed: ${renamedClasses}`,
    `New memberships: ${linkedMembers}`,
    `Missing users: ${missingUsers}`,
    '',
    ...lines,
    '',
    missingList.length ? `--- MISSING USERS ---\n${missingList.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(report.split('\n').slice(0, 10).join('\n'));
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
