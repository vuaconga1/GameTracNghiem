import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { newPlaySessionId } from '@/lib/playSession';

type ProgressStatus = 'empty' | 'correct' | 'wrong';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

function parseReset(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeStatus(value: unknown): ProgressStatus {
  const status = String(value || 'empty').trim().toLowerCase();
  if (status === 'correct' || status === 'wrong') return status;
  return 'empty';
}

function normalizeStatuses(value: unknown): ProgressStatus[] | null {
  if (!Array.isArray(value)) return null;
  return value.map(normalizeStatus);
}

function mergeStatuses(existing: ProgressStatus[], incoming: ProgressStatus[]): ProgressStatus[] {
  const length = Math.max(existing.length, incoming.length);
  const merged: ProgressStatus[] = [];
  for (let i = 0; i < length; i += 1) {
    const next = incoming[i];
    if (next !== undefined && next !== 'empty') {
      merged.push(next);
    } else if (existing[i] !== undefined) {
      merged.push(existing[i]);
    } else {
      merged.push('empty');
    }
  }
  return merged;
}

function parseStoredStatuses(value: unknown): ProgressStatus[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeStatus);
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const courseKey = String(body.courseKey || '').trim();
    const game = String(body.game || '').trim();
    const reset = parseReset(body.reset);
    const incomingStatuses = normalizeStatuses(body.statuses);
    const incomingSession = String(body.playSessionId || '').trim();

    if (!courseKey || !game || !incomingStatuses) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const where = {
      userId_courseKey_game: {
        userId: session.userId,
        courseKey,
        game,
      },
    };

    let statuses = incomingStatuses;
    let playSessionId = incomingSession || null;

    const existing = await prisma.gameProgress.findUnique({
      where,
      select: { statuses: true, playSessionId: true },
    });

    if (!reset) {
      if (existing) {
        statuses = mergeStatuses(parseStoredStatuses(existing.statuses), incomingStatuses);
        if (!playSessionId) {
          playSessionId = existing.playSessionId || null;
        }
      }
      if (!playSessionId) {
        playSessionId = newPlaySessionId();
      }
    } else {
      playSessionId = incomingSession || newPlaySessionId();
    }

    const progress = await prisma.gameProgress.upsert({
      where,
      create: {
        userId: session.userId,
        courseKey,
        game,
        statuses,
        playSessionId,
      },
      update: {
        statuses,
        playSessionId,
      },
    });

    return NextResponse.json({
      success: true,
      statuses: parseStoredStatuses(progress.statuses),
      playSessionId: progress.playSessionId || playSessionId,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
