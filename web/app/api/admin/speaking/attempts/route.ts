import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSpeakingDrillActivityType } from '@/lib/speaking/drillSchemas';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const activityType = url.searchParams.get('activityType')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const courseId = url.searchParams.get('courseId')?.trim();
    const limit = Math.min(
      Math.max(Number(url.searchParams.get('limit') || 100), 1),
      200,
    );
    if (activityType && !isSpeakingDrillActivityType(activityType)) {
      return Response.json(
        { success: false, message: 'Invalid activityType' },
        { status: 400 },
      );
    }
    const attempts = await prisma.speakingAttempt.findMany({
      where: {
        ...(activityType ? { activityType } : {}),
        ...(status ? { status } : {}),
        ...(courseId ? { courseId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        course: { select: { id: true, name: true, levelName: true } },
        question: { select: { id: true, sortOrder: true } },
        scoreLog: { select: { points: true, isCorrect: true } },
      },
    });
    const aggregates = attempts.reduce(
      (total, attempt) => ({
        attempts: total.attempts + 1,
        completed: total.completed + (attempt.status === 'COMPLETED' ? 1 : 0),
        failed: total.failed + (attempt.status === 'FAILED' ? 1 : 0),
        inputTokens: total.inputTokens + (attempt.inputTokens ?? 0),
        outputTokens: total.outputTokens + (attempt.outputTokens ?? 0),
        estimatedCostUsd:
          total.estimatedCostUsd + (attempt.estimatedCostUsd ?? 0),
      }),
      {
        attempts: 0,
        completed: 0,
        failed: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
      },
    );
    return Response.json(
      { success: true, attempts, aggregates },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
