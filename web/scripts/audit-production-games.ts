/**
 * Audit live production game content + HTTP APIs.
 *
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/audit-production-games.ts
 */
import '../lib/loadEnv';

import { prisma } from '../lib/db';
import { GAME_CATALOG } from '../lib/gameCatalog';
import { stripHtmlTags } from '../features/games/exerciseDisplay';

const BASE = process.env.PRODUCTION_BASE_URL || 'https://game-trac-nghiem.vercel.app';
const SAMPLE_PER_LEVEL = 1;

type Finding = {
  severity: 'high' | 'medium' | 'low';
  game: string;
  issue: string;
  course?: string;
  level?: string;
  detail: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return String(value ?? '').trim();
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function blobOf(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

function hasEscapedUnderline(text: string): boolean {
  return /&lt;\s*\/?\s*u\b/i.test(text) || /&amp;lt;\s*\/?\s*u\b/i.test(text);
}

function hasLiteralTagAsText(text: string): boolean {
  return /&lt;[a-z]+/i.test(text);
}

function hasSmartQuotes(text: string): boolean {
  return /[‘’“”]/.test(text);
}

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    redirect: 'follow',
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 400) };
}

async function fetchPage(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function main() {
  const findings: Finding[] = [];
  const push = (finding: Finding) => {
    findings.push(finding);
  };

  const questions = await prisma.question.findMany({
    where: { active: true, archivedAt: null },
    select: {
      id: true,
      game: true,
      payload: true,
      course: { select: { name: true, levelName: true, active: true } },
    },
  });

  const byGame = new Map<string, number>();
  for (const row of questions) {
    byGame.set(row.game, (byGame.get(row.game) || 0) + 1);

    const payload = asRecord(row.payload);
    const course = `${row.course.levelName} / ${row.course.name}`;
    const blob = blobOf(payload);

    if (hasEscapedUnderline(blob) || hasLiteralTagAsText(blob)) {
      push({
        severity: 'high',
        game: row.game,
        issue: 'HTML gạch chân bị escape (hiện chữ <u> trên UI)',
        course,
        level: row.course.levelName,
        detail: blob.slice(0, 220),
      });
    }

    if (row.game === 'quiz') {
      const question = asString(payload.question);
      const answer = asString(payload.answer);
      const options = asList(payload.options);
      const accept = asList(payload.accept);
      const type = asString(payload.type) || 'multiple_choice';
      if (!question) {
        push({
          severity: 'high',
          game: 'quiz',
          issue: 'Câu hỏi trống',
          course,
          detail: row.id,
        });
      }
      if (type === 'multiple_choice' || type === '') {
        if (options.length < 2) {
          push({
            severity: 'high',
            game: 'quiz',
            issue: 'Trắc nghiệm thiếu lựa chọn',
            course,
            detail: question.slice(0, 120),
          });
        }
        const plainOpts = options.map((item) => stripHtmlTags(item).toLowerCase());
        const plainAns = stripHtmlTags(answer).toLowerCase();
        if (answer && plainAns && !plainOpts.includes(plainAns)) {
          const letterOnly = /^[a-d]$/i.test(plainAns);
          push({
            severity: letterOnly ? 'high' : 'medium',
            game: 'quiz',
            issue: letterOnly
              ? 'Đáp án là A/B/C/D không khớp nội dung lựa chọn'
              : 'Đáp án không nằm trong options',
            course,
            detail: `answer=${answer} | options=${options.join(' | ')}`.slice(0, 240),
          });
        }
      }
      if ((type === 'fill_blank' || type === 'word_form') && !answer && accept.length === 0) {
        push({
          severity: 'high',
          game: 'quiz',
          issue: 'Câu điền thiếu đáp án chấp nhận',
          course,
          detail: question.slice(0, 160),
        });
      }
      if (hasSmartQuotes(`${answer} ${accept.join(' ')}`)) {
        push({
          severity: 'medium',
          game: 'quiz',
          issue: 'Đáp án dùng dấu nháy cong — gõ nháy thẳng sẽ bị chấm sai',
          course,
          detail: `${answer} ${accept.join(', ')}`.slice(0, 180),
        });
      }
    }

    if (row.game === 'grammar') {
      const answers = asList(payload.answers);
      const prefix = asString(payload.prefix);
      const suffix = asString(payload.suffix);
      if (answers.length === 0) {
        push({
          severity: 'high',
          game: 'grammar',
          issue: 'Thiếu đáp án',
          course,
          detail: `${prefix} ___ ${suffix}`.slice(0, 180),
        });
      }
      for (const answer of answers) {
        if (/[.,!?;:]$/.test(answer) && !answers.some((item) => item === answer.replace(/[.,!?;:]+$/, ''))) {
          push({
            severity: 'medium',
            game: 'grammar',
            issue: 'Đáp án có dấu câu cuối — viết không dấu sẽ bị chấm sai',
            course,
            detail: answer,
          });
        }
        if (hasSmartQuotes(answer)) {
          push({
            severity: 'medium',
            game: 'grammar',
            issue: 'Đáp án dùng dấu nháy cong — gõ nháy thẳng sẽ bị chấm sai',
            course,
            detail: answer,
          });
        }
      }
    }

    if (row.game === 'scramble') {
      const word = asString(payload.word) || asString(payload.answer);
      if (!word) {
        push({
          severity: 'high',
          game: 'scramble',
          issue: 'Thiếu từ đích',
          course,
          detail: row.id,
        });
      }
    }

    if (
      row.game === 'look_and_write' ||
      row.game === 'choose_and_circle' ||
      row.game === 'read_and_complete' ||
      row.game === 'read_and_match' ||
      row.game === 'vocabulary_test' ||
      row.game === 'vocabulary_check'
    ) {
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (items.length === 0 && !asString(payload.word) && !asString(payload.answer)) {
        push({
          severity: 'medium',
          game: row.game,
          issue: 'Payload trống / không có items',
          course,
          detail: blob.slice(0, 180),
        });
      }
    }
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const scoreRows = await prisma.scoreLog.groupBy({
    by: ['game'],
    where: { answeredAt: { gte: since } },
    _count: { _all: true },
    _sum: { points: true },
  });
  const scoreCorrect = await prisma.scoreLog.groupBy({
    by: ['game'],
    where: { answeredAt: { gte: since }, isCorrect: true },
    _count: { _all: true },
  });
  const correctByGame = new Map(scoreCorrect.map((row) => [row.game, row._count._all]));
  const scoreSummary = scoreRows.map((row) => {
    const total = row._count._all;
    const correct = correctByGame.get(row.game) || 0;
    const wrongRate = total > 0 ? Math.round((1 - correct / total) * 1000) / 10 : 0;
    if (total >= 30 && wrongRate >= 70) {
      push({
        severity: 'medium',
        game: row.game,
        issue: `Tỉ lệ sai rất cao trên production (${wrongRate}% sai / ${total} lượt 14 ngày)`,
        detail: 'Có thể do chấm quá chặt hoặc đáp án/seed lệch',
      });
    }
    return { game: row.game, total, correct, wrongRate };
  });

  const courses = await prisma.course.findMany({
    where: { active: true, archivedAt: null },
    select: { id: true, name: true, levelName: true },
    orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
  });
  const sampleCourses: typeof courses = [];
  const seenLevels = new Set<string>();
  for (const course of courses) {
    if (seenLevels.has(course.levelName)) continue;
    if (!/^Lớp\s+\d+$/.test(course.levelName) && !/logi/i.test(course.levelName)) continue;
    seenLevels.add(course.levelName);
    sampleCourses.push(course);
    if (sampleCourses.length >= 10) break;
  }

  const httpChecks: Array<{
    path: string;
    status: number;
    ok: boolean;
    note: string;
  }> = [];

  const home = await fetchPage('/');
  httpChecks.push({
    path: '/',
    status: home.status,
    ok: home.ok,
    note: home.text.includes('Start learning') || home.text.includes('Bắt đầu')
      ? 'homepage ok'
      : 'homepage missing course cards',
  });
  if (home.text.includes('Application error') || home.text.includes('Internal Server Error')) {
    push({
      severity: 'high',
      game: 'home',
      issue: 'Trang chủ production báo lỗi',
      detail: home.text.slice(0, 200),
    });
  }

  for (const course of sampleCourses.slice(0, 4)) {
    const detail = await fetchPage(`/courses/${encodeURIComponent(course.id)}`);
    httpChecks.push({
      path: `/courses/${course.id}`,
      status: detail.status,
      ok: detail.ok,
      note: `${course.levelName} ${course.name}`,
    });
    if (!detail.ok) {
      push({
        severity: 'high',
        game: 'course',
        issue: 'Trang unit production lỗi HTTP',
        course: `${course.levelName} / ${course.name}`,
        detail: `HTTP ${detail.status}`,
      });
    }

    for (const game of GAME_CATALOG.filter((item) => item.live).slice(0, 11)) {
      const api = await fetchJson(`/api/games/${game.slug}/${encodeURIComponent(course.id)}`);
      const body = asRecord(api.json);
      const success = body.success === true;
      const message = asString(body.message);
      httpChecks.push({
        path: `/api/games/${game.slug}/${course.id}`,
        status: api.status,
        ok: api.ok && (success || api.status === 404),
        note: success ? 'ok' : message || `HTTP ${api.status}`,
      });
      if (api.status >= 500) {
        push({
          severity: 'high',
          game: game.key,
          issue: 'API production 5xx',
          course: `${course.levelName} / ${course.name}`,
          detail: message || api.text,
        });
      }
      if (success && game.key === 'quiz') {
        const qs = Array.isArray(body.questions) ? body.questions : [];
        for (const item of qs.slice(0, 30)) {
          const rec = asRecord(item);
          const q = asString(rec.question);
          if (hasEscapedUnderline(q) || q.includes('&lt;u')) {
            push({
              severity: 'high',
              game: 'quiz',
              issue: 'API trả stem còn chữ <u> thô',
              course: `${course.levelName} / ${course.name}`,
              detail: q.slice(0, 180),
            });
          }
        }
      }
    }
  }

  const capped: Finding[] = [];
  const counts = new Map<string, number>();
  for (const finding of findings) {
    const key = `${finding.game}|${finding.issue}`;
    const n = counts.get(key) || 0;
    if (n >= 8) continue;
    counts.set(key, n + 1);
    capped.push(finding);
  }

  const summary = {
    base: BASE,
    questionCounts: Object.fromEntries([...byGame.entries()].sort()),
    scoreSummary14d: scoreSummary.sort((a, b) => b.wrongRate - a.wrongRate),
    findingCounts: {
      high: findings.filter((item) => item.severity === 'high').length,
      medium: findings.filter((item) => item.severity === 'medium').length,
      low: findings.filter((item) => item.severity === 'low').length,
      shown: capped.length,
      total: findings.length,
    },
    findings: capped,
    httpSample: httpChecks.slice(0, 80),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
