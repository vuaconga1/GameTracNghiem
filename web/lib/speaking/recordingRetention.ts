import 'server-only';

import { prisma } from '@/lib/db';
import { deleteSpeakingRecordingFromDrive } from '@/lib/speaking/driveUpload';
import { deleteSpeakingRecording } from '@/lib/speaking/recordingStorage';

export type RetainedRecording = {
  id: string;
  recordingKey: string | null;
  recordingUrl: string | null;
  driveFileId: string | null;
};

type RetentionDb = {
  speakingSession: {
    update(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<RetainedRecording[]>;
  };
};

export type RecordingRetentionDependencies = {
  db: RetentionDb;
  deleteStorage: typeof deleteSpeakingRecording;
  deleteDrive: typeof deleteSpeakingRecordingFromDrive;
};

const defaultDependencies: RecordingRetentionDependencies = {
  db: prisma as unknown as RetentionDb,
  deleteStorage: deleteSpeakingRecording,
  deleteDrive: deleteSpeakingRecordingFromDrive,
};

/**
 * External deletes happen before metadata is cleared. Partial failures keep all
 * metadata for a later idempotent retry.
 */
export async function cleanupSpeakingRecording(
  recording: RetainedRecording,
  input?: {
    now?: Date;
    dependencies?: RecordingRetentionDependencies;
  },
) {
  const now = input?.now ?? new Date();
  const dependencies = input?.dependencies ?? defaultDependencies;
  await dependencies.db.speakingSession.update({
    where: { id: recording.id },
    data: {
      recordingCleanupAttempts: { increment: 1 },
      recordingCleanupLastAttemptAt: now,
    },
  });

  try {
    const storageKey = recording.recordingKey;
    if (storageKey) await dependencies.deleteStorage(storageKey);
    if (recording.driveFileId) {
      await dependencies.deleteDrive(recording.driveFileId);
    }

    await dependencies.db.speakingSession.update({
      where: { id: recording.id },
      data: {
        recordingUrl: null,
        recordingKey: null,
        recordingMimeType: null,
        recordingBytes: null,
        driveFileId: null,
        driveFileName: null,
        recordingDeleteAfter: null,
        recordingDeletedAt: now,
        recordingCleanupLastError: null,
      },
    });
    return { deleted: true, sessionId: recording.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Recording cleanup failed';
    await dependencies.db.speakingSession.update({
      where: { id: recording.id },
      data: { recordingCleanupLastError: message.slice(0, 1_000) },
    });
    throw error;
  }
}

export async function cleanupDueSpeakingRecordings(input?: {
  now?: Date;
  limit?: number;
  dependencies?: RecordingRetentionDependencies;
}) {
  const now = input?.now ?? new Date();
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 100);
  const dependencies = input?.dependencies ?? defaultDependencies;
  const recordings = await dependencies.db.speakingSession.findMany({
    where: {
      recordingDeletedAt: null,
      recordingDeleteAfter: { lte: now },
      OR: [
        { recordingKey: { not: null } },
        { driveFileId: { not: null } },
      ],
    },
    orderBy: { recordingDeleteAfter: 'asc' },
    take: limit,
    select: {
      id: true,
      recordingKey: true,
      recordingUrl: true,
      driveFileId: true,
    },
  });
  const results = await Promise.allSettled(
    recordings.map((recording) =>
      cleanupSpeakingRecording(recording, { now, dependencies }),
    ),
  );
  return {
    found: recordings.length,
    deleted: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}
