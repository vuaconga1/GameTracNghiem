/**
 * Re-sync classes + members from Excel DiemDanh sheets only.
 * Sources: E:\Active\*.xlsx and E:\Active\XVNT\*.xlsx
 *
 * - Class title from DiemDanh header (never History / BACKUP ARCHIVE)
 * - Students only from DiemDanh
 * - Creates missing WewinStudent accounts (password = username)
 * - Replaces class membership to match DiemDanh exactly
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/resync-classes-diemdanh.ts
 *   … -- --dry-run
 */
import '../lib/loadEnv';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import XLSX from 'xlsx';

import { hashPassword } from '../lib/auth';
import { prisma } from '../lib/db';

const ROOTS = ['E:/Active', 'E:/Active/XVNT'];
const REPORT_PATH = 'E:/Active/_resync_diemdanh.txt';
const EXTRACT_PATH = 'E:/Active/_extract_students_diemdanh.txt';
const dryRun = process.argv.includes('--dry-run');

type Student = { username: string; displayName: string };
type ClassBlock = {
  code: string;
  name: string;
  source: string;
  students: Student[];
};

function cell(v: unknown): string {
  if (v == null) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function isStudentId(s: string): boolean {
  return /^(WeWIN\d+-(HV|KH)-\d+|WeWIN-HV\d+-\d+)$/i.test(s);
}

function classCodeFromFile(fileName: string): string | null {
  const m = fileName.match(/CLASS__(WW\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

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
  if (looksLikeTeacher) return parts.slice(0, -1).join(' - ').trim();
  return title.trim();
}

function extractClassTitle(rows: unknown[][]): string {
  for (const row of rows.slice(0, 5)) {
    if (!Array.isArray(row)) continue;
    for (let i = 0; i < Math.min(row.length, 8); i++) {
      const v = cell(row[i]);
      if (!v) continue;
      if (/BACKUP\s*ARCHIVE/i.test(v)) continue;
      if (v.includes('GV và TAs')) continue;
      if (/^mã hv$/i.test(v) || isStudentId(v)) continue;
      if (v.length < 3) continue;
      // Prefer cells that look like class program titles
      if (
        /SUPER|KET|FLYERS|MOVERS|STARTERS|KIDS|IELTS|TOEIC|CLASS|PET|PRE|Grammar|TUTOR|STAR |FOUNDATION/i.test(
          v,
        ) ||
        (/[A-Za-zÀ-ỹ].*-.*[A-Za-zÀ-ỹ]/.test(v) && v.length > 6)
      ) {
        return stripTeachers(v);
      }
    }
  }
  return '';
}

function extractStudents(rows: unknown[][]): Student[] {
  const out: Student[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const username = cell(row[0]);
    let displayName = cell(row[1]);
    if (!isStudentId(username) || !displayName) continue;
    if (/^mã hv$/i.test(username) || isStudentId(displayName)) continue;
    // Drop trailing notes like "(Đã báo mã HV)"
    displayName = displayName.replace(/\s*\(.*?\)\s*$/u, '').trim() || displayName;
    const key = username.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ username, displayName });
  }
  return out;
}

function listExcelFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~') && !f.startsWith('_'))
      .map((f) => path.join(dir, f))
      .sort();
  } catch {
    return [];
  }
}

function parseWorkbook(filePath: string): ClassBlock | null {
  const code = classCodeFromFile(path.basename(filePath));
  if (!code) return null;
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = wb.SheetNames.find((n) => /^DiemDanh$/i.test(n));
  if (!sheetName) {
    return { code, name: code, source: filePath, students: [] };
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  const program = extractClassTitle(rows);
  const name = program ? `${code} — ${program}` : code;
  return {
    code,
    name,
    source: filePath,
    students: extractStudents(rows),
  };
}

async function resolveCreatorUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin', archivedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (admin) return admin.id;
  const any = await prisma.user.findFirst({
    where: { archivedAt: null },
    select: { id: true },
  });
  if (!any) throw new Error('No user available as class creator');
  return any.id;
}

async function findClassByCode(code: string) {
  const hits = await prisma.schoolClass.findMany({
    where: {
      OR: [
        { name: code },
        { name: { startsWith: `${code} —` } },
        { name: { startsWith: `${code} -` } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  return hits[0] ?? null;
}

async function main() {
  const files = ROOTS.flatMap(listExcelFiles);
  const blocks = files.map(parseWorkbook).filter((b): b is ClassBlock => Boolean(b));
  // Prefer first occurrence if duplicate WW codes across folders
  const byCode = new Map<string, ClassBlock>();
  for (const b of blocks) {
    if (!byCode.has(b.code)) byCode.set(b.code, b);
  }
  const classes = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));

  const extractLines: string[] = [];
  for (const c of classes) {
    extractLines.push(`## ${c.name}`);
    extractLines.push(`Source: ${c.source}`);
    for (const s of c.students) extractLines.push(`${s.username} | ${s.displayName}`);
    if (!c.students.length) extractLines.push('(không có học viên trong DiemDanh)');
    extractLines.push('');
  }
  writeFileSync(EXTRACT_PATH, extractLines.join('\n'), 'utf8');

  console.log(
    `Parsed ${classes.length} classes from ${files.length} files; students=${classes.reduce((n, c) => n + c.students.length, 0)}`,
  );
  console.log('Sample:', classes.slice(0, 3).map((c) => ({ name: c.name, n: c.students.length })));
  console.log('WW00028/29:', classes.filter((c) => c.code === 'WW00028' || c.code === 'WW00029'));

  if (dryRun) return;

  const creatorId = await resolveCreatorUserId();
  const allStudents = classes.flatMap((c) => c.students);
  const uniqueStudents = new Map<string, Student>();
  for (const s of allStudents) {
    const key = s.username.toUpperCase();
    if (!uniqueStudents.has(key)) uniqueStudents.set(key, s);
  }

  const existingUsers = await prisma.user.findMany({
    where: { username: { contains: 'WeWIN', mode: 'insensitive' } },
    select: { id: true, username: true, role: true, archivedAt: true },
  });
  const userByUpper = new Map(existingUsers.map((u) => [u.username.toUpperCase(), u]));

  let createdUsers = 0;
  for (const student of uniqueStudents.values()) {
    const key = student.username.toUpperCase();
    const found = userByUpper.get(key);
    if (found) {
      if (found.role !== 'admin') {
        await prisma.user.update({
          where: { id: found.id },
          data: {
            displayName: student.displayName,
            role: 'WewinStudent',
            archivedAt: null,
          },
        });
      }
      continue;
    }
    const passwordHash = await hashPassword(student.username);
    const created = await prisma.user.create({
      data: {
        username: student.username,
        displayName: student.displayName,
        passwordHash,
        role: 'WewinStudent',
      },
      select: { id: true, username: true, role: true, archivedAt: true },
    });
    userByUpper.set(created.username.toUpperCase(), created);
    createdUsers += 1;
  }

  let createdClasses = 0;
  let renamed = 0;
  let membershipAdds = 0;
  let membershipRemoves = 0;
  const report: string[] = [];

  for (const block of classes) {
    let schoolClass = await findClassByCode(block.code);
    if (!schoolClass) {
      schoolClass = await prisma.schoolClass.create({
        data: { name: block.name, createdByUserId: creatorId },
        select: { id: true, name: true },
      });
      createdClasses += 1;
      report.push(`CREATED ${block.name}`);
    } else if (schoolClass.name !== block.name) {
      await prisma.schoolClass.update({
        where: { id: schoolClass.id },
        data: { name: block.name },
      });
      renamed += 1;
      report.push(`RENAMED ${schoolClass.name} → ${block.name}`);
      schoolClass = { id: schoolClass.id, name: block.name };
    } else {
      report.push(`EXISTS ${block.name}`);
    }

    const desiredIds = new Set<string>();
    for (const s of block.students) {
      const u = userByUpper.get(s.username.toUpperCase());
      if (u) desiredIds.add(u.id);
    }

    const current = await prisma.classMember.findMany({
      where: { classId: schoolClass.id },
      select: { userId: true },
    });
    const currentIds = new Set(current.map((m) => m.userId));
    const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

    if (toAdd.length) {
      const r = await prisma.classMember.createMany({
        data: toAdd.map((userId) => ({ classId: schoolClass!.id, userId })),
        skipDuplicates: true,
      });
      membershipAdds += r.count;
    }
    if (toRemove.length) {
      const r = await prisma.classMember.deleteMany({
        where: { classId: schoolClass.id, userId: { in: toRemove } },
      });
      membershipRemoves += r.count;
    }
    report.push(
      `  members desired=${desiredIds.size} +${toAdd.length} -${toRemove.length}`,
    );
  }

  const summary = [
    `DiemDanh resync — ${new Date().toISOString()}`,
    `Files: ${files.length}`,
    `Classes: ${classes.length}`,
    `Created users: ${createdUsers}`,
    `Created classes: ${createdClasses}`,
    `Renamed classes: ${renamed}`,
    `Membership +${membershipAdds} / -${membershipRemoves}`,
    `Extract: ${EXTRACT_PATH}`,
    '',
    ...report,
  ].join('\n');
  writeFileSync(REPORT_PATH, summary, 'utf8');
  console.log(summary.split('\n').slice(0, 12).join('\n'));
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
