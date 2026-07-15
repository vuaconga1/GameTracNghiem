import { NextResponse } from 'next/server';

import { publicApiErrorMessage } from '@/lib/apiErrors';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculatePoints } from '@/lib/scoring';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  return NextResponse.json(
    { success: false, message: publicApiErrorMessage(err) },
    { status }
  );
}

function parseIsCorrect(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const course = String(body.course || '').trim();
    const game = String(body.game || '').trim();
    const questionIndex = Number(body.questionIndex);
    const isCorrect = parseIsCorrect(body.isCorrect);
    const elapsedMs = Number(body.elapsedMs) || 0;

    if (!course || !game || !Number.isInteger(questionIndex) || questionIndex < 0) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const points = calculatePoints(isCorrect, elapsedMs);

    await prisma.scoreLog.create({
      data: {
        userId: session.userId,
        course,
        game,
        questionIndex,
        isCorrect,
        elapsedMs,
        points,
      },
    });

    const aggregate = await prisma.scoreLog.aggregate({
      where: {
        userId: session.userId,
        course,
      },
      _sum: {
        points: true,
      },
    });

    const courseScore = aggregate._sum.points ?? 0;

    return NextResponse.json({
      success: true,
      points,
      isCorrect,
      courseScore,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
