import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/speaking/recordingStorage', () => ({
  deleteSpeakingRecording: vi.fn(),
}));
vi.mock('@/lib/speaking/driveUpload', () => ({
  deleteSpeakingRecordingFromDrive: vi.fn(),
}));

import {
  cleanupSpeakingRecording,
  type RecordingRetentionDependencies,
} from '@/lib/speaking/recordingRetention';

function dependencies() {
  return {
    db: {
      speakingSession: {
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    deleteStorage: vi.fn().mockResolvedValue(undefined),
    deleteDrive: vi.fn().mockResolvedValue(undefined),
  } as unknown as RecordingRetentionDependencies;
}

const recording = {
  id: 'session-1',
  recordingKey: 'https://blob.example/speaking-recordings/session-1.webm',
  recordingUrl: '/api/speaking/sessions/session-1/recording',
  driveFileId: 'drive-1',
};

describe('Speaking recording retention', () => {
  it('deletes private Blob/local and Drive before clearing metadata', async () => {
    const deps = dependencies();
    await cleanupSpeakingRecording(recording, {
      now: new Date('2026-09-05T00:00:00.000Z'),
      dependencies: deps,
    });

    expect(deps.deleteStorage).toHaveBeenCalledWith(recording.recordingKey);
    expect(deps.deleteDrive).toHaveBeenCalledWith('drive-1');
    const updates = vi.mocked(deps.db.speakingSession.update).mock.calls;
    expect(updates).toHaveLength(2);
    expect(updates[1][0]).toMatchObject({
      data: {
        recordingKey: null,
        recordingUrl: null,
        driveFileId: null,
        recordingDeletedAt: expect.any(Date),
      },
    });
  });

  it('keeps metadata after a Drive failure and retries idempotently', async () => {
    const deps = dependencies();
    vi.mocked(deps.deleteDrive)
      .mockRejectedValueOnce(new Error('Drive unavailable'))
      .mockResolvedValueOnce(undefined);

    await expect(
      cleanupSpeakingRecording(recording, { dependencies: deps }),
    ).rejects.toThrow('Drive unavailable');
    let updates = vi.mocked(deps.db.speakingSession.update).mock.calls;
    expect(updates).toHaveLength(2);
    expect(updates[1][0]).toMatchObject({
      data: { recordingCleanupLastError: 'Drive unavailable' },
    });
    expect(JSON.stringify(updates[1][0])).not.toContain('"recordingKey":null');

    await cleanupSpeakingRecording(recording, { dependencies: deps });
    updates = vi.mocked(deps.db.speakingSession.update).mock.calls;
    expect(deps.deleteStorage).toHaveBeenCalledTimes(2);
    expect(deps.deleteDrive).toHaveBeenCalledTimes(2);
    expect(updates.at(-1)?.[0]).toMatchObject({
      data: { recordingKey: null, driveFileId: null },
    });
  });
});
