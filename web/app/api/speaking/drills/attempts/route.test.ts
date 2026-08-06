import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireSession = vi.fn();
const runSpeakingDrillPipeline = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}));
vi.mock('@/lib/speaking/drillPipeline', () => ({
  runSpeakingDrillPipeline: (...args: unknown[]) =>
    runSpeakingDrillPipeline(...args),
}));
vi.mock('@/lib/speaking/security', () => ({
  assertSpeakingMutationRequest: vi.fn(),
  enforceSpeakingBurstLimit: vi.fn().mockResolvedValue({ count: 1 }),
  SpeakingSecurityError: class SpeakingSecurityError extends Error {},
}));

import { POST } from '@/app/api/speaking/drills/attempts/route';

function request() {
  const form = new FormData();
  form.set('courseId', 'course-1');
  form.set('questionId', 'question-1');
  form.set('activityType', 'WORD_PRONUNCIATION');
  form.set('idempotencyKey', 'stable-idempotency-key');
  form.set('audioDurationMs', '1500');
  form.set('locale', 'en');
  form.set(
    'audio',
    new File(
      [
        new Uint8Array([
          0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
          0x07, 0x08,
        ]),
      ],
      'drill.webm',
      { type: 'audio/webm' },
    ),
  );
  return new Request('http://localhost/api/speaking/drills/attempts', {
    method: 'POST',
    body: form,
  });
}

describe('POST /api/speaking/drills/attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({
      userId: 'student-1',
      username: 'student',
      displayName: 'Student',
      role: 'student',
    });
  });

  it('returns the pipeline prior-attempt decision on an idempotent retry', async () => {
    runSpeakingDrillPipeline.mockResolvedValue({
      idempotent: true,
      points: 193,
      attempt: {
        id: 'attempt-1',
        status: 'COMPLETED',
        score: 100,
        transcript: 'hello',
      },
    });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      idempotent: true,
      points: 193,
      attempt: { id: 'attempt-1', score: 100 },
    });
    expect(runSpeakingDrillPipeline).toHaveBeenCalledTimes(1);
  });

  it('authenticates before parsing multipart audio', async () => {
    requireSession.mockRejectedValue(
      Object.assign(new Error('Not signed in'), { status: 401 }),
    );
    const formData = vi.fn();

    const response = await POST({ formData } as unknown as Request);

    expect(response.status).toBe(401);
    expect(formData).not.toHaveBeenCalled();
    expect(runSpeakingDrillPipeline).not.toHaveBeenCalled();
  });
});
