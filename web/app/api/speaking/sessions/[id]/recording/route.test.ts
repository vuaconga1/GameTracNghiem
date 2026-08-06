import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  findUnique: vi.fn(),
  auditCreate: vi.fn(),
  open: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => mocks.requireSession(...args),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    speakingSession: {
      findUnique: (...args: unknown[]) => mocks.findUnique(...args),
      update: vi.fn(),
    },
    speakingRecordingAccessAudit: {
      create: (...args: unknown[]) => mocks.auditCreate(...args),
    },
  },
}));
vi.mock('@/lib/speaking/access', () => ({
  evaluateSpeakingAccess: vi.fn(),
  SPEAKING_ACCESS_REASON: { DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED' },
  SpeakingAccessError: class SpeakingAccessError extends Error {},
}));
vi.mock('@/lib/speaking/recordingStorage', () => ({
  openSpeakingRecording: (...args: unknown[]) => mocks.open(...args),
  saveSpeakingRecording: vi.fn(),
  speakingRecordingPublicUrl: vi.fn(),
}));
vi.mock('@/lib/speaking/driveUpload', () => ({
  buildSpeakingDriveFileName: vi.fn(),
  isSpeakingDriveConfigured: vi.fn().mockReturnValue(false),
  uploadSpeakingRecordingToDrive: vi.fn(),
}));

import { GET } from '@/app/api/speaking/sessions/[id]/recording/route';

const storedSession = {
  id: 'session-1',
  userId: 'student-1',
  recordingKey: 'https://blob.example/private.webm',
  recordingUrl: '/api/speaking/sessions/session-1/recording',
  recordingMimeType: 'audio/webm',
  kind: 'STUDENT_PRACTICE',
  courseId: 'course-1',
  activityType: 'REALTIME_CONVERSATION',
};

describe('private Speaking recording access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(storedSession);
    mocks.open.mockResolvedValue({
      body: Buffer.from([1, 2, 3]),
      contentLength: 3,
    });
    mocks.auditCreate.mockResolvedValue({});
  });

  it('rejects an IDOR attempt by another student without opening storage', async () => {
    mocks.requireSession.mockResolvedValue({
      userId: 'student-2',
      role: 'student',
    });
    const response = await GET(
      new Request('http://localhost/api/speaking/sessions/session-1/recording'),
      { params: Promise.resolve({ id: 'session-1' }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('audits authenticated admin access before streaming private bytes', async () => {
    mocks.requireSession.mockResolvedValue({
      userId: 'admin-1',
      role: 'admin',
    });
    const response = await GET(
      new Request('http://localhost/api/speaking/sessions/session-1/recording'),
      { params: Promise.resolve({ id: 'session-1' }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toMatch(/private/);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        adminId: 'admin-1',
        action: 'STREAM',
      },
    });
  });
});
