/**
 * Import spreadsheet tables from `Game Trắc Nghiệm.xlsx` into Postgres.
 *
 * Usage (from web/):
 *   npx tsx scripts/import-from-excel.ts
 *   npx tsx scripts/import-from-excel.ts --file "../Game Trắc Nghiệm.xlsx"
 *   npx tsx scripts/import-from-excel.ts --keep-questions
 *   npx tsx scripts/import-from-excel.ts --replace-scores
 */
import '../lib/loadEnv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

import { progressCourseKey } from '../lib/courseKey';
import { prisma } from '../lib/db';

const DEFAULT_EXCEL = resolve(process.cwd(), '../Game Trắc Nghiệm.xlsx');

type Row = Record<string, unknown>;
type CourseRef = { id: string; name: string; levelName: string };

type Stats = {
  created: number;
  updated: number;
  skipped: number;
};

function emptyStats(): Stats {
  return { created: 0, updated: 0, skipped: 0 };
}

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function cell(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  const normalizedWanted = keys.map(normalizeHeader);
  for (const [rawKey, value] of Object.entries(row)) {
    if (normalizedWanted.includes(normalizeHeader(rawKey))) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
  }
  return '';
}

function normalizeHeader(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s*\/\s*/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseBool(value: unknown, defaultValue = true): boolean {
  if (value === '' || value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['false', '0', 'no', 'không', 'khong', 'n'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'có', 'co', 'y'].includes(normalized)) return true;
  if (normalized.includes('/')) return defaultValue;
  return defaultValue;
}

function splitPipe(value: unknown): string[] {
  return String(value || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

function toDriveImageUrl(url: unknown): string {
  const source = String(url || '').trim();
  if (!source) return '';
  const fileMatch = source.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const idMatch = source.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  return source;
}

/** Excel serial date → JS Date (UTC noon approximation is fine for logs). */
function excelDateToJs(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return new Date();
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const fractional = serial - Math.floor(serial);
  return new Date(utcMs + Math.round(fractional * 86400 * 1000));
}

function isStarterNoteRow(row: Row): boolean {
  const order = cell(row, 'Thứ tự', 'thu_tu', 'order', 'stt');
  if (/[,…]/.test(order)) return true;
  const code = cell(row, 'Mã bài', 'ma_bai', 'ma');
  if (code.includes('…')) return true;
  const active = cell(row, 'Đang dùng', 'dang_dung', 'active');
  if (active.includes('/')) return true;
  const course = cell(row, 'Tên khóa học', 'ten_khoa_hoc', 'course');
  if (/trùng sheet/i.test(course) || /trung sheet/i.test(course)) return true;
  return false;
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: '', raw: true }).filter((row) =>
    Object.values(row).some((value) => String(value ?? '').trim() !== '')
  );
}

function modeLabel(mode: string): string {
  if (mode === 'sentence') return 'Luyện câu';
  if (mode === 'word') return 'Luyện từ';
  return 'Luyện âm';
}

async function importUsers(rows: Row[]): Promise<Stats> {
  const stats = emptyStats();
  for (const row of rows) {
    const username = cell(row, 'Username', 'username');
    const password = cell(row, 'Password', 'password');
    const displayName = cell(row, 'Name', 'displayName', 'display_name');
    if (!username || !password || !displayName) {
      stats.skipped += 1;
      continue;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { username } });
    await prisma.user.upsert({
      where: { username },
      update: { passwordHash, displayName },
      create: { username, passwordHash, displayName },
    });
    if (existing) stats.updated += 1;
    else stats.created += 1;
  }
  return stats;
}

async function importClassLevels(rows: Row[]): Promise<Stats> {
  const stats = emptyStats();
  const seen = new Set<string>();
  for (const row of rows) {
    const levelName = cell(row, 'level', 'levelName', 'cap');
    const active = parseBool(cell(row, 'active', 'dang_dung') || row.active, true);
    if (!levelName || seen.has(levelName)) {
      stats.skipped += 1;
      continue;
    }
    seen.add(levelName);
    const existing = await prisma.classLevel.findUnique({
      where: { levelName },
    });
    await prisma.classLevel.upsert({
      where: { levelName },
      update: { active },
      create: { levelName, active },
    });
    if (existing) stats.updated += 1;
    else stats.created += 1;
  }
  return stats;
}

async function importCourses(rows: Row[]): Promise<Stats> {
  const stats = emptyStats();
  for (const row of rows) {
    const levelName = cell(row, 'level', 'levelName');
    const name = cell(row, 'course', 'name', 'ten_khoa_hoc');
    const active = parseBool(cell(row, 'active') || row.active, true);
    if (!levelName || !name) {
      stats.skipped += 1;
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
      stats.updated += 1;
    } else {
      await prisma.course.create({
        data: { name, levelName, active },
      });
      stats.created += 1;
    }

    await prisma.classLevel.upsert({
      where: { levelName },
      update: { active: true },
      create: { levelName, active: true },
    });
  }
  return stats;
}

async function ensureCourseByName(courseName: string): Promise<CourseRef[]> {
  const name = courseName.trim();
  if (!name) return [];

  const existing = await prisma.course.findMany({
    where: { name },
    select: { id: true, name: true, levelName: true },
  });
  if (existing.length) return existing;

  const created = await prisma.course.create({
    data: {
      name,
      levelName: 'Chung',
      active: true,
    },
    select: { id: true, name: true, levelName: true },
  });
  await prisma.classLevel.upsert({
    where: { levelName: 'Chung' },
    update: { active: true },
    create: { levelName: 'Chung', active: true },
  });
  return [created];
}

async function createQuestion(args: {
  courseId: string;
  game: string;
  level?: string | null;
  payload: Prisma.InputJsonValue;
  active: boolean;
  sortOrder: number;
  externalId?: string | null;
}) {
  await prisma.question.create({
    data: {
      courseId: args.courseId,
      game: args.game,
      level: args.level || null,
      payload: args.payload,
      active: args.active,
      sortOrder: args.sortOrder,
      externalId: args.externalId || null,
    },
  });
}

async function importGrammar(rows: Row[], replace: boolean): Promise<Stats> {
  const stats = emptyStats();
  if (replace) {
    await prisma.question.deleteMany({ where: { game: 'grammar' } });
  }

  let sort = 0;
  for (const row of rows) {
    const courseName = cell(row, 'course');
    const prefix = cell(row, 'prefix');
    const answers = splitPipe(cell(row, 'answers'));
    if (!courseName || !prefix || !answers.length) {
      stats.skipped += 1;
      continue;
    }
    const courses = await ensureCourseByName(courseName);
    const active = parseBool(cell(row, 'active') || row.active, true);
    const externalId = cell(row, 'id') || null;
    sort += 1;
    const payload: Prisma.InputJsonValue = {
      source: cell(row, 'source'),
      prefix,
      suffix: cell(row, 'suffix'),
      hint: cell(row, 'hint'),
      answers,
    };
    for (const course of courses) {
      await createQuestion({
        courseId: course.id,
        game: 'grammar',
        level: course.levelName,
        payload,
        active,
        sortOrder: sort,
        externalId,
      });
      stats.created += 1;
    }
  }
  return stats;
}

async function importQuiz(rows: Row[], replace: boolean): Promise<Stats> {
  const stats = emptyStats();
  if (replace) {
    await prisma.question.deleteMany({ where: { game: 'quiz' } });
  }

  let sort = 0;
  for (const row of rows) {
    const courseName = cell(row, 'course');
    const question = cell(row, 'question');
    const answer = cell(row, 'answer');
    if (!courseName || !question || !answer) {
      stats.skipped += 1;
      continue;
    }
    const type = cell(row, 'type') || 'multiple_choice';
    const options = splitPipe(cell(row, 'option_a', 'options'));
    const accept = splitPipe(cell(row, 'accept'));
    const fillMode = type === 'fill_blank' || type === 'word_form';
    const courses = await ensureCourseByName(courseName);
    const active = parseBool(cell(row, 'active') || row.active, true);
    const externalId = cell(row, 'id') || null;
    sort += 1;
    const payload: Prisma.InputJsonValue = {
      type,
      typeLabel: cell(row, 'type_label', 'typeLabel'),
      question,
      answer,
      options,
      accept: accept.length ? accept : [answer],
      fillMode,
    };
    for (const course of courses) {
      await createQuestion({
        courseId: course.id,
        game: 'quiz',
        level: course.levelName,
        payload,
        active,
        sortOrder: sort,
        externalId,
      });
      stats.created += 1;
    }
  }
  return stats;
}

async function importPronunciation(rows: Row[], replace: boolean): Promise<Stats> {
  const stats = emptyStats();
  if (replace) {
    await prisma.question.deleteMany({ where: { game: 'pronunciation' } });
  }

  let sort = 0;
  for (const row of rows) {
    const courseName = cell(row, 'course');
    const targetText = cell(row, 'target_text', 'targetText');
    if (!courseName || !targetText) {
      stats.skipped += 1;
      continue;
    }
    const mode = cell(row, 'mode') || 'phoneme';
    const courses = await ensureCourseByName(courseName);
    const active = parseBool(cell(row, 'active') || row.active, true);
    const externalId = cell(row, 'id') || null;
    sort += 1;
    const payload: Prisma.InputJsonValue = {
      mode,
      modeLabel: modeLabel(mode),
      prompt: cell(row, 'prompt'),
      targetText,
      targetIpa: cell(row, 'target_ipa', 'targetIpa'),
      referenceAudioUrl: cell(row, 'reference_audio_url', 'referenceAudioUrl'),
      hint: cell(row, 'hint'),
    };
    for (const course of courses) {
      await createQuestion({
        courseId: course.id,
        game: 'pronunciation',
        level: course.levelName,
        payload,
        active,
        sortOrder: sort,
        externalId,
      });
      stats.created += 1;
    }
  }
  return stats;
}

type StarterGroup = {
  code: string;
  courseName: string;
  title: string;
  instruction: string;
  wordBank: string[];
  active: boolean;
  items: Array<Record<string, unknown>>;
};

function groupStarterRows(
  rows: Row[],
  buildItem: (row: Row, order: number) => Record<string, unknown> | null
): StarterGroup[] {
  const groups = new Map<string, StarterGroup>();

  for (const row of rows) {
    if (isStarterNoteRow(row)) continue;
    const code = cell(row, 'Mã bài', 'ma_bai', 'ma');
    const courseName = cell(row, 'Tên khóa học', 'ten_khoa_hoc', 'course');
    if (!code || !courseName) continue;
    if (!parseBool(cell(row, 'Đang dùng', 'dang_dung', 'active') || row['Đang dùng'], true)) {
      continue;
    }

    const orderRaw = Number(cell(row, 'Thứ tự', 'thu_tu', 'order', 'stt'));
    const order = Number.isFinite(orderRaw) && orderRaw > 0 ? orderRaw : 0;
    const item = buildItem(row, order || 1);
    if (!item) continue;

    const key = `${courseName}::${code}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        code,
        courseName,
        title: '',
        instruction: '',
        wordBank: [],
        active: true,
        items: [],
      };
      groups.set(key, group);
    }

    const title = cell(row, 'Tiêu đề bài', 'tieu_de_bai', 'title');
    const instruction = cell(row, 'Hướng dẫn', 'huong_dan', 'instruction');
    const wordBank = splitPipe(cell(row, 'Hộp từ gợi ý', 'hop_tu_goi_y', 'word_bank'));
    if (title) group.title = title;
    if (instruction) group.instruction = instruction;
    if (wordBank.length && !group.wordBank.length) group.wordBank = wordBank;
    group.items.push(item);
  }

  return [...groups.values()].map((group) => {
    group.items.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    return group;
  });
}

async function importStarterGame(
  game: string,
  rows: Row[],
  replace: boolean,
  buildItem: (row: Row, order: number) => Record<string, unknown> | null,
  buildPayload: (group: StarterGroup) => Prisma.InputJsonValue
): Promise<Stats> {
  const stats = emptyStats();
  if (replace) {
    await prisma.question.deleteMany({ where: { game } });
  }

  const groups = groupStarterRows(rows, buildItem);
  let sort = 0;
  for (const group of groups) {
    if (!group.items.length) {
      stats.skipped += 1;
      continue;
    }
    const courses = await ensureCourseByName(group.courseName);
    sort += 1;
    const payload = buildPayload(group);
    for (const course of courses) {
      await createQuestion({
        courseId: course.id,
        game,
        level: course.levelName,
        payload,
        active: group.active,
        sortOrder: sort,
        externalId: group.code,
      });
      stats.created += 1;
    }
  }
  return stats;
}

async function importProgress(rows: Row[]): Promise<Stats> {
  const stats = emptyStats();
  for (const row of rows) {
    const username = cell(row, 'username');
    const courseName = cell(row, 'course');
    const game = cell(row, 'game');
    const statusesRaw = cell(row, 'statuses') || row.statuses;
    if (!username || !courseName || !game) {
      stats.skipped += 1;
      continue;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      stats.skipped += 1;
      continue;
    }

    let statuses: unknown = [];
    try {
      statuses = typeof statusesRaw === 'string' ? JSON.parse(statusesRaw) : statusesRaw;
    } catch {
      statuses = [];
    }
    if (!Array.isArray(statuses)) statuses = [];

    const courses = await ensureCourseByName(courseName);
    for (const course of courses) {
      const courseKey = progressCourseKey(course.name, course.levelName);
      const existing = await prisma.gameProgress.findUnique({
        where: {
          userId_courseKey_game: {
            userId: user.id,
            courseKey,
            game,
          },
        },
      });
      await prisma.gameProgress.upsert({
        where: {
          userId_courseKey_game: {
            userId: user.id,
            courseKey,
            game,
          },
        },
        create: {
          userId: user.id,
          courseKey,
          game,
          statuses: statuses as Prisma.InputJsonValue,
        },
        update: {
          statuses: statuses as Prisma.InputJsonValue,
        },
      });
      if (existing) stats.updated += 1;
      else stats.created += 1;
    }
  }
  return stats;
}

async function importScoreLog(rows: Row[], replace: boolean): Promise<Stats> {
  const stats = emptyStats();
  if (replace) {
    await prisma.scoreLog.deleteMany({});
  }

  for (const row of rows) {
    const username = cell(row, 'username');
    const course = cell(row, 'course');
    const game = cell(row, 'game');
    const questionIndex = Number(cell(row, 'question_index') || row.question_index);
    if (!username || !course || !game || !Number.isInteger(questionIndex)) {
      stats.skipped += 1;
      continue;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      stats.skipped += 1;
      continue;
    }

    const isCorrect = parseBool(cell(row, 'is_correct') || row.is_correct, false);
    const elapsedMs = Number(cell(row, 'elapsed_ms') || row.elapsed_ms) || 0;
    const points = Number(cell(row, 'points') || row.points) || 0;
    const answeredAt = excelDateToJs(row.answered_at ?? cell(row, 'answered_at'));

    await prisma.scoreLog.create({
      data: {
        userId: user.id,
        course,
        game,
        questionIndex,
        isCorrect,
        elapsedMs,
        points,
        answeredAt,
      },
    });
    stats.created += 1;
  }
  return stats;
}

function printStats(label: string, stats: Stats) {
  console.log(
    `  ${label}: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`
  );
}

async function main() {
  const excelPath = resolve(argValue('--file') || DEFAULT_EXCEL);
  const replaceQuestions = !hasFlag('--keep-questions');
  const replaceScores = hasFlag('--replace-scores');

  if (!existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  console.log(`Reading ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);

  const users = await importUsers(readSheetRows(workbook, 'User'));
  const classLevels = await importClassLevels(readSheetRows(workbook, 'Class_Level'));
  const courses = await importCourses(readSheetRows(workbook, 'Courses'));

  const grammar = await importGrammar(readSheetRows(workbook, 'Questions_Grammar'), replaceQuestions);
  const quiz = await importQuiz(readSheetRows(workbook, 'Questions_Quiz'), replaceQuestions);
  const pronunciation = await importPronunciation(
    readSheetRows(workbook, 'Questions_Pronunciation'),
    replaceQuestions
  );

  const lookAndWrite = await importStarterGame(
    'look_and_write',
    readSheetRows(workbook, 'Nhin_va_viet'),
    replaceQuestions,
    (row, order) => {
      const answer = cell(row, 'Đáp án đúng', 'dap_an_dung', 'answer');
      if (!answer) return null;
      return {
        order,
        image: toDriveImageUrl(cell(row, 'Link hình ảnh', 'link_hinh_anh', 'image')),
        answer,
      };
    },
    (group) => ({
      title: group.title || group.code,
      instruction: group.instruction || 'Look and write.',
      word_bank: group.wordBank.length
        ? group.wordBank
        : group.items.map((item) => String(item.answer || '')).filter(Boolean),
      items: group.items as Prisma.InputJsonValue[],
    })
  );

  const chooseAndCircle = await importStarterGame(
    'choose_and_circle',
    readSheetRows(workbook, 'Chon_va_khoanh'),
    replaceQuestions,
    (row, order) => {
      const optionA = cell(row, 'Lựa chọn A', 'lua_chon_a', 'option_a');
      const optionB = cell(row, 'Lựa chọn B', 'lua_chon_b', 'option_b');
      let answer = cell(row, 'Đáp án đúng', 'dap_an_dung', 'answer');
      if (!optionA || !optionB) return null;
      if (answer.toUpperCase() === 'A') answer = optionA;
      if (answer.toUpperCase() === 'B') answer = optionB;
      if (!answer) return null;
      return {
        order,
        image: toDriveImageUrl(cell(row, 'Link hình ảnh', 'link_hinh_anh', 'image')),
        options: [optionA, optionB],
        answer,
      };
    },
    (group) => ({
      title: group.title || group.code,
      instruction: group.instruction || 'Look at the picture and circle the correct word.',
      items: group.items as Prisma.InputJsonValue[],
    })
  );

  const readAndComplete = await importStarterGame(
    'read_and_complete',
    readSheetRows(workbook, 'Doc_va_hoan_thanh'),
    replaceQuestions,
    (row, order) => {
      const sentence = cell(row, 'Nội dung câu', 'noi_dung_cau', 'sentence');
      const answer = cell(row, 'Đáp án đúng', 'dap_an_dung', 'answer');
      if (!sentence || !answer) return null;
      return {
        order,
        sentence,
        image: toDriveImageUrl(cell(row, 'Link hình gợi ý', 'link_hinh_goi_y', 'image')),
        answer,
      };
    },
    (group) => ({
      title: group.title || group.code,
      instruction: group.instruction || 'Complete the sentences with words from the box.',
      word_bank: group.wordBank.length
        ? group.wordBank
        : group.items.map((item) => String(item.answer || '')).filter(Boolean),
      items: group.items as Prisma.InputJsonValue[],
    })
  );

  const readAndMatch = await importStarterGame(
    'read_and_match',
    readSheetRows(workbook, 'Doc_va_noi'),
    replaceQuestions,
    (row, order) => {
      const sentence = cell(row, 'Nội dung câu', 'noi_dung_cau', 'sentence');
      const label = cell(row, 'Nhãn hình', 'nhan_hinh', 'label');
      const answer = cell(row, 'Đáp án đúng', 'dap_an_dung', 'answer') || label;
      if (!sentence || !answer) return null;
      return {
        order,
        sentence,
        image: toDriveImageUrl(cell(row, 'Link hình ảnh', 'link_hinh_anh', 'image')),
        label: label || answer,
        answer,
      };
    },
    (group) => ({
      title: group.title || group.code,
      instruction: group.instruction || 'Match each sentence to the correct picture.',
      items: group.items as Prisma.InputJsonValue[],
    })
  );

  const vocabularyTest = await importStarterGame(
    'vocabulary_test',
    readSheetRows(workbook, 'Kiem_tra_tu_vung'),
    replaceQuestions,
    (row, order) => {
      const answer = cell(row, 'Đáp án đúng', 'dap_an_dung', 'answer');
      if (!answer) return null;
      return {
        order,
        image: toDriveImageUrl(cell(row, 'Link hình ảnh', 'link_hinh_anh', 'image')),
        answer,
      };
    },
    (group) => ({
      title: group.title || group.code,
      instruction: group.instruction || 'Look at the pictures and write the words.',
      word_bank: group.wordBank.length
        ? group.wordBank
        : group.items.map((item) => String(item.answer || '')).filter(Boolean),
      items: group.items as Prisma.InputJsonValue[],
    })
  );

  const vocabularyCheck = await importStarterGame(
    'vocabulary_check',
    readSheetRows(workbook, 'Kiem_tra_dung_sai'),
    replaceQuestions,
    (row, order) => {
      const word = cell(row, 'Từ hiển thị', 'tu_hien_thi', 'word');
      const sentence = cell(row, 'Câu mô tả', 'cau_mo_ta', 'sentence');
      const truth = cell(row, 'Đúng hay sai?', 'dung_hay_sai', 'is_correct');
      if (!word || !sentence) return null;
      const normalized = truth.toLowerCase();
      const isCorrect =
        normalized === 'đúng' ||
        normalized === 'dung' ||
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'yes' ||
        normalized === 'có' ||
        normalized === 'co';
      return {
        order,
        image: toDriveImageUrl(cell(row, 'Link hình ảnh', 'link_hinh_anh', 'image')),
        word,
        sentence,
        is_correct: isCorrect,
      };
    },
    (group) => ({
      title: group.title || group.code,
      instruction: group.instruction || 'Look at the picture and word. Is the sentence correct?',
      items: group.items as Prisma.InputJsonValue[],
    })
  );

  const progress = await importProgress(readSheetRows(workbook, 'Progress'));
  const scoreLog = await importScoreLog(readSheetRows(workbook, 'ScoreLog'), replaceScores);

  console.log('Import complete');
  printStats('users', users);
  printStats('class_levels', classLevels);
  printStats('courses', courses);
  printStats('grammar', grammar);
  printStats('quiz', quiz);
  printStats('pronunciation', pronunciation);
  printStats('look_and_write', lookAndWrite);
  printStats('choose_and_circle', chooseAndCircle);
  printStats('read_and_complete', readAndComplete);
  printStats('read_and_match', readAndMatch);
  printStats('vocabulary_test', vocabularyTest);
  printStats('vocabulary_check', vocabularyCheck);
  printStats('progress', progress);
  printStats('score_log', scoreLog);
  console.log('  skipped sheets: HuongDan (docs), leaderboard (derived from ScoreLog)');
  console.log('  missing in Excel: Questions_Scramble, Questions_WordMatch');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
