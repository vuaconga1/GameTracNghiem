import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  assertSpeakingAccess: vi.fn(),
  evaluateSpeakingAccess: vi.fn(),
  assertScheduler: vi.fn(),
  createRealtimeCall: vi.fn(),
  createRealtimeClientSecret: vi.fn(),
  hangupRealtimeCall: vi.fn(),
  releaseReservationOnFailure: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => mocks.requireSession(...args),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    speakingSession: {
      findUnique: (...args: unknown[]) => mocks.findUnique(...args),
      update: (...args: unknown[]) => mocks.update(...args),
    },
  },
}));
vi.mock('@/lib/speaking/access', () => ({
  SpeakingAccessError: class SpeakingAccessError extends Error {},
  assertSpeakingAccess: (...args: unknown[]) =>
    mocks.assertSpeakingAccess(...args),
  evaluateSpeakingAccess: (...args: unknown[]) =>
    mocks.evaluateSpeakingAccess(...args),
  SPEAKING_ACCESS_REASON: { DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED' },
}));
vi.mock('@/lib/speaking/sessionEndScheduler', () => ({
  assertSessionEndSchedulerReady: (...args: unknown[]) =>
    mocks.assertScheduler(...args),
}));
vi.mock('@/lib/speaking/openaiRealtime', () => ({
  createRealtimeCall: (...args: unknown[]) => mocks.createRealtimeCall(...args),
  createRealtimeClientSecret: (...args: unknown[]) =>
    mocks.createRealtimeClientSecret(...args),
  hangupRealtimeCall: (...args: unknown[]) =>
    mocks.hangupRealtimeCall(...args),
}));
vi.mock('@/lib/speaking/usage', () => ({
  SpeakingConflictError: class SpeakingConflictError extends Error {},
  SpeakingLimitError: class SpeakingLimitError extends Error {},
  releaseReservationOnFailure: (...args: unknown[]) =>
    mocks.releaseReservationOnFailure(...args),
}));
vi.mock('@/lib/speaking/security', () => ({
  assertSpeakingMutationRequest: vi.fn(),
  enforceSpeakingBurstLimit: vi.fn().mockResolvedValue({ count: 1 }),
  SpeakingSecurityError: class SpeakingSecurityError extends Error {},
}));

import { POST } from '@/app/api/speaking/sessions/[id]/realtime/route';

const session = {
  id: 'session-1',
  userId: 'admin-1',
  courseId: 'course-1',
  activityType: 'REALTIME_CONVERSATION',
  kind: 'ADMIN_PREVIEW',
  status: 'RESERVED',
  reservationExpiresAt: new Date(Date.now() + 60_000),
  mustEndAt: null,
  openaiCallId: null,
  topic: {
    id: 'topic-1',
    title: 'School',
    instructions: 'Talk about school.',
    durationSeconds: 180,
    active: true,
    archivedAt: null,
    course: { id: 'course-1', levelName: 'Lớp 8', name: 'Unit 1' },
  },
};
const offerSdp = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';

describe('POST /api/speaking/sessions/:id/realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPEAKING_REALTIME_LEGACY_CLIENT_SECRET_FALLBACK;
    mocks.requireSession.mockResolvedValue({
      userId: 'admin-1',
      username: 'admin',
      displayName: 'Admin',
      role: 'admin',
    });
    mocks.findUnique.mockResolvedValue(session);
    mocks.update.mockResolvedValue(session);
    mocks.createRealtimeCall.mockResolvedValue({
      sdpAnswer: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
      callId: 'rtc_location_123',
      model: 'gpt-realtime-mini',
    });
    mocks.hangupRealtimeCall.mockResolvedValue({ closed: true, status: 200 });
  });

  afterEach(() => {
    delete process.env.SPEAKING_REALTIME_LEGACY_CLIENT_SECRET_FALLBACK;
  });

  it('exchanges SDP on the backend and stores the Location call ID', async () => {
    const response = await POST(
      new Request('http://localhost/api/speaking/sessions/session-1/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offerSdp,
      }),
      { params: Promise.resolve({ id: 'session-1' }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.assertScheduler).toHaveBeenCalledBefore(
      mocks.createRealtimeCall,
    );
    expect(mocks.createRealtimeCall).toHaveBeenCalledWith(
      expect.objectContaining({ sdp: offerSdp }),
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ openaiCallId: 'rtc_location_123' }),
      }),
    );
    expect(json).toMatchObject({
      success: true,
      transport: 'unified-webrtc',
      sdpAnswer: expect.stringContaining('v=0'),
    });
    expect(json).not.toHaveProperty('clientSecret');
  });

  it('fails before OpenAI when the durable scheduler is unavailable', async () => {
    const error = Object.assign(new Error('scheduler missing'), { status: 503 });
    mocks.assertScheduler.mockImplementationOnce(() => {
      throw error;
    });

    const response = await POST(
      new Request('http://localhost/api/speaking/sessions/session-1/realtime', {
        method: 'POST',
        body: offerSdp,
      }),
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(503);
    expect(mocks.createRealtimeCall).not.toHaveBeenCalled();
  });

  it('keeps the client-secret rollback limited to flagged admin previews', async () => {
    process.env.SPEAKING_REALTIME_LEGACY_CLIENT_SECRET_FALLBACK = 'true';
    mocks.createRealtimeClientSecret.mockResolvedValue({
      clientSecret: 'ek_preview',
      expiresAt: 123,
      model: 'gpt-realtime-mini',
    });

    const response = await POST(
      new Request(
        'http://localhost/api/speaking/sessions/session-1/realtime?legacyClientSecret=1',
        { method: 'POST', body: offerSdp },
      ),
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      transport: 'legacy-client-secret',
      clientSecret: 'ek_preview',
    });
    expect(mocks.createRealtimeCall).not.toHaveBeenCalled();
  });
});
