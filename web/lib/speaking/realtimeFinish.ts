import type { Prisma } from '@prisma/client';

import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import {
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
} from '@/lib/speaking/config';
import { realtimeSpeakingPracticeScore } from '@/lib/speaking/practiceScoring';

const FINISHABLE_STATUSES = new Set<string>([
  SPEAKING_SESSION_STATUS.ACTIVE,
  SPEAKING_SESSION_STATUS.FINISHING,
  SPEAKING_SESSION_STATUS.UPLOADING,
  SPEAKING_SESSION_STATUS.UPLOAD_FAILED,
]);

function finishError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function finishRealtimeSpeakingSession(input: {
  sessionId: string;
  userId: string;
  transcript?: unknown;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    audioInputTokens: number;
    audioOutputTokens: number;
  };
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`speaking-realtime-finish:${input.sessionId}`}))`;

    const session = await tx.speakingSession.findUnique({
      where: { id: input.sessionId },
      include: {
        course: { select: { name: true, levelName: true } },
        topic: { select: { sortOrder: true } },
        scoreLog: true,
      },
    });
    if (!session || session.userId !== input.userId) {
      throw finishError(404, 'Không tìm thấy phiên');
    }
    if (!FINISHABLE_STATUSES.has(session.status)) {
      throw finishError(409, 'Phiên chưa Active — không thể kết thúc');
    }

    const endedAt = session.endedAt ?? now;
    let scoreLog = session.scoreLog;
    if (
      !scoreLog &&
      session.kind === SPEAKING_SESSION_KIND.STUDENT_PRACTICE &&
      session.activityType === 'REALTIME_CONVERSATION' &&
      session.startedAt &&
      session.topic
    ) {
      const practiceScore = realtimeSpeakingPracticeScore(
        session.startedAt,
        endedAt,
      );
      if (practiceScore.eligible) {
        scoreLog = await tx.scoreLog.create({
          data: {
            userId: session.userId,
            course: progressCourseKey(
              session.course.name,
              session.course.levelName,
            ),
            game: 'speaking_realtime',
            questionIndex: Math.max(0, session.topic.sortOrder),
            isCorrect: true,
            elapsedMs: practiceScore.elapsedMs,
            points: practiceScore.points,
            countsForCourseTotal: false,
          },
        });
      }
    }

    const updated = await tx.speakingSession.update({
      where: { id: session.id },
      data: {
        status: SPEAKING_SESSION_STATUS.FINISHING,
        transcript:
          (input.transcript ??
            session.transcript ??
            undefined) as Prisma.InputJsonValue,
        endedAt,
        ...(input.usage
          ? {
              inputTokens: input.usage.inputTokens,
              outputTokens: input.usage.outputTokens,
              audioInputTokens: input.usage.audioInputTokens,
              audioOutputTokens: input.usage.audioOutputTokens,
            }
          : {}),
        ...(scoreLog ? { scoreLogId: scoreLog.id } : {}),
      },
    });

    return {
      session: updated,
      points: scoreLog?.points ?? 0,
      scored: Boolean(scoreLog),
    };
  });
}
