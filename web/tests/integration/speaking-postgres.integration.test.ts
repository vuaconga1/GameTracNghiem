import type { PrismaClient } from '@prisma/client';
import type { RecordingRetentionDependencies } from '@/lib/speaking/recordingRetention';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const testDatabaseUrl = process.env.SPEAKING_TEST_DATABASE_URL?.trim() || '';
const runId = `speaking-it-${Date.now()}-${process.pid}`;
const courseId = `${runId}-course`;
const topicId = `${runId}-topic`;
const questionId = `${runId}-question`;
const adminId = `${runId}-admin`;
const now = new Date('2026-08-06T03:00:00.000Z');

type AccessModule = typeof import('@/lib/speaking/access');
type DrillModule = typeof import('@/lib/speaking/drillAttempts');
type RetentionModule = typeof import('@/lib/speaking/recordingRetention');
type UsageModule = typeof import('@/lib/speaking/usage');

let prisma: PrismaClient;
let accessModule: AccessModule;
let drillModule: DrillModule;
let retentionModule: RetentionModule;
let usageModule: UsageModule;
let previousConfigs: Array<{
  activityType: string;
  enabled: boolean;
  dailyLimit: number;
  durationSeconds: number;
  reservationTtlSeconds: number;
  promptVersion: string;
}>;

function assertDedicatedDatabase(connectionString: string) {
  const url = new URL(connectionString);
  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  const looksLikeTestDatabase = /test/i.test(decodeURIComponent(url.pathname));
  if (
    !isLocal &&
    !looksLikeTestDatabase &&
    process.env.SPEAKING_TEST_ALLOW_REMOTE !== 'true'
  ) {
    throw new Error(
      'SPEAKING_TEST_DATABASE_URL must target localhost or a database whose name contains "test". ' +
        'Set SPEAKING_TEST_ALLOW_REMOTE=true only for an isolated disposable remote test database.',
    );
  }
}

async function cleanupRunData() {
  if (!prisma) return;
  await prisma.course.deleteMany({ where: { id: courseId } });
  await prisma.user.deleteMany({
    where: { username: { startsWith: `${runId}-student-` } },
  });
  await prisma.user.deleteMany({ where: { id: adminId } });
}

async function createStudent(label: string, input?: { startsAt?: Date; expiresAt?: Date }) {
  const id = `${runId}-student-${label}`;
  const user = await prisma.user.create({
    data: {
      id,
      username: id,
      passwordHash: 'integration-only',
      displayName: `Integration ${label}`,
      role: 'WewinStudent',
      portalLinkedAt: new Date('2026-08-01T00:00:00.000Z'),
      speakingAccountStatus: 'ACTIVE',
    },
  });
  await prisma.speakingEntitlement.create({
    data: {
      id: `${id}-entitlement`,
      userId: user.id,
      courseId,
      status: 'ACTIVE',
      startsAt: input?.startsAt ?? new Date('2026-08-01T17:00:00.000Z'),
      expiresAt: input?.expiresAt ?? new Date('2026-09-01T17:00:00.000Z'),
      source: 'INTEGRATION_TEST',
      createdById: adminId,
    },
  });
  return {
    user,
    session: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: 'WewinStudent' as const,
    },
  };
}

async function reserveRealtime(userId: string, at: Date) {
  return usageModule.createPracticeSession({
    userId,
    topicId,
    courseId,
    now: at,
  });
}

const describeWithDatabase = testDatabaseUrl ? describe.sequential : describe.skip;

describeWithDatabase(
  'AI Speaking PostgreSQL integration (requires SPEAKING_TEST_DATABASE_URL)',
  () => {
    beforeAll(async () => {
      assertDedicatedDatabase(testDatabaseUrl);
      process.env.DATABASE_URL = testDatabaseUrl;
      process.env.SPEAKING_EMERGENCY_DISABLED = 'false';

      ({ prisma } = await import('@/lib/db'));
      accessModule = await import('@/lib/speaking/access');
      drillModule = await import('@/lib/speaking/drillAttempts');
      retentionModule = await import('@/lib/speaking/recordingRetention');
      usageModule = await import('@/lib/speaking/usage');

      await prisma.$queryRaw`SELECT 1 FROM "SpeakingAttempt" LIMIT 0`;
      await cleanupRunData();

      previousConfigs = await prisma.speakingActivityConfig.findMany({
        where: {
          activityType: {
            in: [
              'WORD_PRONUNCIATION',
              'SENTENCE_READING',
              'GUIDED_ANSWER',
              'REALTIME_CONVERSATION',
            ],
          },
        },
      });
      const configs = [
        ['WORD_PRONUNCIATION', 30, 60],
        ['SENTENCE_READING', 20, 120],
        ['GUIDED_ANSWER', 15, 180],
        ['REALTIME_CONVERSATION', 2, 180],
      ] as const;
      for (const [activityType, dailyLimit, durationSeconds] of configs) {
        await prisma.speakingActivityConfig.upsert({
          where: { activityType },
          create: {
            activityType,
            enabled: true,
            dailyLimit,
            durationSeconds,
            reservationTtlSeconds: 120,
            promptVersion: 'integration-v1',
          },
          update: {
            enabled: true,
            dailyLimit,
            durationSeconds,
            reservationTtlSeconds: 120,
            promptVersion: 'integration-v1',
          },
        });
      }

      await prisma.user.create({
        data: {
          id: adminId,
          username: adminId,
          passwordHash: 'integration-only',
          displayName: 'Integration Admin',
          role: 'admin',
        },
      });
      await prisma.course.create({
        data: {
          id: courseId,
          name: 'Speaking Integration Unit',
          levelName: 'Lớp 8',
          active: true,
          enabledSkills: ['speaking'],
        },
      });
      await prisma.speakingTopic.create({
        data: {
          id: topicId,
          courseId,
          title: 'Integration conversation',
          instructions: 'Use safe mocked content only.',
          durationSeconds: 180,
          active: true,
          sortOrder: 7,
        },
      });
      await prisma.question.create({
        data: {
          id: questionId,
          courseId,
          game: 'speaking_drill',
          sortOrder: 4,
          active: true,
          payload: {
            kind: 'word',
            targetText: 'hello',
            acceptedAnswers: [],
            sampleAnswers: [],
            keywords: [],
            hints: [],
          },
        },
      });
    }, 30_000);

    afterAll(async () => {
      if (!prisma) return;
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS "test_fail_speaking_scorelog" ON "ScoreLog"',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS "test_fail_speaking_scorelog"()',
      );
      await cleanupRunData();
      for (const config of previousConfigs ?? []) {
        await prisma.speakingActivityConfig.update({
          where: { activityType: config.activityType },
          data: {
            enabled: config.enabled,
            dailyLimit: config.dailyLimit,
            durationSeconds: config.durationSeconds,
            reservationTtlSeconds: config.reservationTtlSeconds,
            promptVersion: config.promptVersion,
          },
        });
      }
      await prisma.$disconnect();
    }, 30_000);

    it('enforces entitlement start/exclusive-expiry boundaries in real PostgreSQL', async () => {
      const startsAt = new Date('2026-08-05T17:00:00.000Z');
      const expiresAt = new Date('2026-08-06T17:00:00.000Z');
      const { session } = await createStudent('boundaries', { startsAt, expiresAt });

      const before = await accessModule.evaluateSpeakingAccess({
        session,
        courseId,
        activityType: 'REALTIME_CONVERSATION',
        now: new Date(startsAt.getTime() - 1),
      });
      const atStart = await accessModule.evaluateSpeakingAccess({
        session,
        courseId,
        activityType: 'REALTIME_CONVERSATION',
        now: startsAt,
      });
      const beforeExpiry = await accessModule.evaluateSpeakingAccess({
        session,
        courseId,
        activityType: 'REALTIME_CONVERSATION',
        now: new Date(expiresAt.getTime() - 1),
      });
      const atExpiry = await accessModule.evaluateSpeakingAccess({
        session,
        courseId,
        activityType: 'REALTIME_CONVERSATION',
        now: expiresAt,
      });

      expect(before.reason).toBe('NO_ACTIVE_COURSE');
      expect(atStart.reason).toBe('ALLOWED');
      expect(beforeExpiry.reason).toBe('ALLOWED');
      expect(atExpiry.reason).toBe('COURSE_EXPIRED');
    });

    it('uses Vietnam dates and transfers a held reservation across VN midnight', async () => {
      const { user, session } = await createStudent('vn-midnight');
      const beforeMidnight = new Date('2026-08-05T16:59:30.000Z');
      const afterMidnight = new Date('2026-08-05T17:00:05.000Z');
      const reserved = await reserveRealtime(user.id, beforeMidnight);

      await usageModule.finalizeActivityAttempt({
        sessionId: reserved.session.id,
        userId: user.id,
        authSession: session,
        idempotencyKey: 'vn-midnight-start',
        now: afterMidnight,
      });

      const rows = await prisma.dailySpeakingUsage.findMany({
        where: { userId: user.id, activityType: 'REALTIME_CONVERSATION' },
        orderBy: { usageDateVN: 'asc' },
      });
      const storedDates = await prisma.$queryRaw<Array<{ usage_date: string }>>`
        SELECT "usageDateVN"::text AS usage_date
        FROM "DailySpeakingUsage"
        WHERE "userId" = ${user.id}
          AND "activityType" = 'REALTIME_CONVERSATION'
        ORDER BY "usageDateVN" ASC
      `;
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ usedCount: 0, reservedCount: 0 });
      expect(rows[1]).toMatchObject({ usedCount: 1, reservedCount: 0 });
      expect(storedDates).toEqual([
        { usage_date: '2026-08-05' },
        { usage_date: '2026-08-06' },
      ]);
    });

    it('allows two starts, makes duplicate /started idempotent, and denies the third', async () => {
      const { user, session } = await createStudent('two-starts');

      const first = await reserveRealtime(user.id, now);
      const firstStart = await usageModule.finalizeActivityAttempt({
        sessionId: first.session.id,
        userId: user.id,
        authSession: session,
        idempotencyKey: 'first-start',
        now,
      });
      const duplicate = await usageModule.finalizeActivityAttempt({
        sessionId: first.session.id,
        userId: user.id,
        authSession: session,
        idempotencyKey: 'first-start',
        now: new Date(now.getTime() + 1_000),
      });
      expect(firstStart.alreadyStarted).toBe(false);
      expect(duplicate.alreadyStarted).toBe(true);
      await prisma.speakingSession.update({
        where: { id: first.session.id },
        data: { status: 'SUBMITTED', endedAt: new Date(now.getTime() + 35_000) },
      });

      const secondAt = new Date(now.getTime() + 60_000);
      const second = await reserveRealtime(user.id, secondAt);
      await usageModule.finalizeActivityAttempt({
        sessionId: second.session.id,
        userId: user.id,
        authSession: session,
        idempotencyKey: 'second-start',
        now: secondAt,
      });
      await prisma.speakingSession.update({
        where: { id: second.session.id },
        data: { status: 'SUBMITTED', endedAt: new Date(secondAt.getTime() + 35_000) },
      });

      await expect(
        reserveRealtime(user.id, new Date(secondAt.getTime() + 60_000)),
      ).rejects.toMatchObject({ code: 'DAILY_SPEAKING_LIMIT_REACHED' });

      const quota = await prisma.dailySpeakingUsage.findUniqueOrThrow({
        where: {
          userId_usageDateVN_activityType: {
            userId: user.id,
            usageDateVN: new Date('2026-08-06T00:00:00.000Z'),
            activityType: 'REALTIME_CONVERSATION',
          },
        },
      });
      expect(quota).toMatchObject({ usedCount: 2, reservedCount: 0 });
      expect(
        await prisma.speakingSessionEndJob.count({
          where: { session: { userId: user.id } },
        }),
      ).toBe(2);
    });

    it('serializes concurrent tabs to one Realtime reservation', async () => {
      const { user } = await createStudent('concurrent-tabs');
      const results = await Promise.allSettled([
        reserveRealtime(user.id, now),
        reserveRealtime(user.id, now),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      const quota = await prisma.dailySpeakingUsage.findFirstOrThrow({
        where: { userId: user.id, activityType: 'REALTIME_CONVERSATION' },
      });
      expect(quota).toMatchObject({ usedCount: 0, reservedCount: 1 });
      expect(
        await prisma.speakingSession.count({
          where: { userId: user.id, status: 'RESERVED' },
        }),
      ).toBe(1);
    });

    it('releases failed drills, completes successful drills, and reuses idempotent results', async () => {
      const { user, session } = await createStudent('drill-lifecycle');
      const failed = await drillModule.reserveSpeakingDrillAttempt({
        authSession: session,
        courseId,
        questionId,
        activityType: 'WORD_PRONUNCIATION',
        idempotencyKey: 'failed-drill-key',
        now,
      });
      expect(failed.kind).toBe('reserved');
      if (failed.kind !== 'reserved') throw new Error('Expected reservation');
      await expect(
        drillModule.failSpeakingDrillAttempt({
          attemptId: failed.attemptId,
          userId: user.id,
          failureCode: 'MOCK_TRANSCRIPTION_FAILED',
          now,
        }),
      ).resolves.toEqual({ released: true });
      await expect(
        drillModule.failSpeakingDrillAttempt({
          attemptId: failed.attemptId,
          userId: user.id,
          failureCode: 'MOCK_TRANSCRIPTION_FAILED',
          now,
        }),
      ).resolves.toEqual({ released: false });

      const reserved = await drillModule.reserveSpeakingDrillAttempt({
        authSession: session,
        courseId,
        questionId,
        activityType: 'WORD_PRONUNCIATION',
        idempotencyKey: 'successful-drill-key',
        now: new Date(now.getTime() + 1_000),
      });
      if (reserved.kind !== 'reserved') throw new Error('Expected reservation');
      const completed = await drillModule.completeSpeakingDrillAttempt({
        attemptId: reserved.attemptId,
        userId: user.id,
        transcript: 'hello',
        score: 92,
        details: { source: 'integration-mock' },
        feedback: { praise: 'Clear response' },
        audioMimeType: 'audio/webm',
        audioBytes: 512,
        audioDurationMs: 1_500,
        model: 'mock-transcriber',
        now: new Date(now.getTime() + 2_000),
      });
      const duplicate = await drillModule.completeSpeakingDrillAttempt({
        attemptId: reserved.attemptId,
        userId: user.id,
        transcript: 'hello',
        score: 92,
        details: {},
        feedback: {},
        audioMimeType: 'audio/webm',
        audioBytes: 512,
        audioDurationMs: 1_500,
        model: 'mock-transcriber',
      });
      const replay = await drillModule.reserveSpeakingDrillAttempt({
        authSession: session,
        courseId,
        questionId,
        activityType: 'WORD_PRONUNCIATION',
        idempotencyKey: 'successful-drill-key',
      });

      expect(completed.idempotent).toBe(false);
      expect(duplicate.idempotent).toBe(true);
      expect(replay.kind).toBe('completed');
      expect(
        await prisma.scoreLog.count({
          where: { userId: user.id, game: 'speaking_drill' },
        }),
      ).toBe(1);
      const quota = await prisma.dailySpeakingUsage.findFirstOrThrow({
        where: { userId: user.id, activityType: 'WORD_PRONUNCIATION' },
      });
      expect(quota).toMatchObject({ usedCount: 1, reservedCount: 0 });
    });

    it('rolls quota, attempt, and ScoreLog back atomically when score persistence fails', async () => {
      const { user, session } = await createStudent('score-atomicity');
      const reserved = await drillModule.reserveSpeakingDrillAttempt({
        authSession: session,
        courseId,
        questionId,
        activityType: 'WORD_PRONUNCIATION',
        idempotencyKey: 'atomic-drill-key',
        now,
      });
      if (reserved.kind !== 'reserved') throw new Error('Expected reservation');
      if (!/^[a-z0-9-]+$/i.test(user.id)) throw new Error('Unsafe integration user id');

      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION "test_fail_speaking_scorelog"()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW."userId" = '${user.id}' AND NEW."game" = 'speaking_drill' THEN
            RAISE EXCEPTION 'forced integration ScoreLog failure';
          END IF;
          RETURN NEW;
        END
        $$
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "test_fail_speaking_scorelog"
        BEFORE INSERT ON "ScoreLog"
        FOR EACH ROW EXECUTE FUNCTION "test_fail_speaking_scorelog"()
      `);

      try {
        await expect(
          drillModule.completeSpeakingDrillAttempt({
            attemptId: reserved.attemptId,
            userId: user.id,
            transcript: 'hello',
            score: 95,
            details: {},
            feedback: {},
            audioMimeType: 'audio/webm',
            audioBytes: 512,
            audioDurationMs: 1_500,
            model: 'mock-transcriber',
            now: new Date(now.getTime() + 1_000),
          }),
        ).rejects.toThrow('forced integration ScoreLog failure');
      } finally {
        await prisma.$executeRawUnsafe(
          'DROP TRIGGER IF EXISTS "test_fail_speaking_scorelog" ON "ScoreLog"',
        );
        await prisma.$executeRawUnsafe(
          'DROP FUNCTION IF EXISTS "test_fail_speaking_scorelog"()',
        );
      }

      const attempt = await prisma.speakingAttempt.findUniqueOrThrow({
        where: { id: reserved.attemptId },
      });
      const quota = await prisma.dailySpeakingUsage.findFirstOrThrow({
        where: { userId: user.id, activityType: 'WORD_PRONUNCIATION' },
      });
      expect(attempt).toMatchObject({ status: 'PROCESSING', scoreLogId: null });
      expect(quota).toMatchObject({ usedCount: 0, reservedCount: 1 });
      expect(await prisma.scoreLog.count({ where: { userId: user.id } })).toBe(0);
    });

    it('cleans due recording metadata only after mocked external deletion succeeds', async () => {
      const { user } = await createStudent('retention');
      const session = await prisma.speakingSession.create({
        data: {
          id: `${runId}-retention-session`,
          userId: user.id,
          courseId,
          topicId,
          activityType: 'REALTIME_CONVERSATION',
          kind: 'STUDENT_PRACTICE',
          status: 'SUBMITTED',
          recordingUrl: '/api/speaking/sessions/private-recording/recording',
          recordingKey: `test://${runId}/recording.webm`,
          driveFileId: `${runId}-drive`,
          recordingDeleteAfter: new Date(now.getTime() - 1_000),
        },
      });
      const deleteStorage = vi.fn().mockResolvedValue(undefined);
      const deleteDrive = vi.fn().mockResolvedValue(undefined);

      const dependencies = {
        db: prisma,
        deleteStorage,
        deleteDrive,
      } as unknown as RecordingRetentionDependencies;
      const result = await retentionModule.cleanupSpeakingRecording(
        {
          id: session.id,
          recordingUrl: session.recordingUrl,
          recordingKey: session.recordingKey,
          driveFileId: session.driveFileId,
        },
        {
          now,
          dependencies,
        },
      );

      expect(result).toEqual({ deleted: true, sessionId: session.id });
      expect(deleteStorage).toHaveBeenCalledWith(session.recordingKey);
      expect(deleteDrive).toHaveBeenCalledWith(session.driveFileId);
      await expect(
        prisma.speakingSession.findUniqueOrThrow({ where: { id: session.id } }),
      ).resolves.toMatchObject({
        recordingUrl: null,
        recordingKey: null,
        driveFileId: null,
        recordingDeletedAt: expect.any(Date),
      });
    });
  },
);

if (!testDatabaseUrl) {
  describe('AI Speaking PostgreSQL integration prerequisites', () => {
    it.skip(
      'set SPEAKING_TEST_DATABASE_URL to a migrated disposable PostgreSQL database',
      () => undefined,
    );
  });
}
